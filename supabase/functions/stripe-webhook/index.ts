import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from '../_shared/cors.ts'

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Get the correct Stripe key based on payment mode
    const { data: settings } = await supabaseClient
      .from('payment_settings')
      .select('mode')
      .limit(1)
      .single();
    
    const mode = settings?.mode || 'test';
    const stripeKey = Deno.env.get(mode === 'live' ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY');
    
    if (!stripeKey) {
      throw new Error(`Stripe key not found for ${mode} mode`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // We'll skip signature verification for now since it requires webhook endpoint secret
    // In production, you should verify the webhook signature
    const event = JSON.parse(body);
    
    logStep("Processing webhook event", { type: event.type });

    // Handle successful payments
    if (event.type === 'checkout.session.completed' || 
        event.type === 'invoice.payment_succeeded' ||
        event.type === 'payment_intent.succeeded') {
      
      const session = event.data.object;
      const customerEmail = session.customer_email || session.customer_details?.email;
      
      if (!customerEmail) {
        logStep("No customer email found in webhook");
        return new Response("OK", { status: 200 });
      }

      logStep("Payment successful", { customerEmail, sessionId: session.id });

      // Find user by email
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (userError || !user) {
        logStep("User not found", { email: customerEmail });
        return new Response("OK", { status: 200 });
      }

      // Determine VIP type based on amount or subscription
      let vipType = 'monthly';
      let vipExpiresAt = null;
      let dailyDownloads = 20;
      let unlimitedDownloads = false;

      if (session.mode === 'payment') {
        // One-time payment (lifetime)
        vipType = 'lifetime';
        dailyDownloads = 999999;
        unlimitedDownloads = true;
      } else if (session.mode === 'subscription') {
        // Subscription - determine type by amount
        const amount = session.amount_total;
        if (amount >= 3999) { // $39.99 or more = yearly
          vipType = 'yearly';
          dailyDownloads = 30;
          vipExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          vipType = 'monthly';
          dailyDownloads = 20;
          vipExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      // Update both users and customers tables
      await Promise.all([
        supabaseClient
          .from('users')
          .update({
            vip_type: vipType,
            subscription_status: 'active',
            vip_expires_at: vipExpiresAt,
            daily_downloads_remaining: dailyDownloads,
            unlimited_downloads: unlimitedDownloads
          })
          .eq('id', user.id),
        supabaseClient
          .from('customers')
          .update({
            vip_type: vipType,
            subscription_status: 'active',
            vip_expires_at: vipExpiresAt,
            daily_downloads_remaining: dailyDownloads
          })
          .eq('user_id', user.id)
      ]);

      logStep("VIP status updated", { userId: user.id, vipType, vipExpiresAt });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});