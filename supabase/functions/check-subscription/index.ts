import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from '../_shared/cors.ts'

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Get the correct Stripe key based on payment mode
const getStripeKey = async (supabaseClient: any) => {
  try {
    const { data: settings, error } = await supabaseClient
      .from('payment_settings')
      .select('mode')
      .limit(1)
      .single();
    
    if (error) {
      logStep("Error fetching payment settings", { error: error.message });
      return null;
    }
    
    const mode = settings?.mode || 'test';
    const keyName = mode === 'live' ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY';
    const key = Deno.env.get(keyName);
    
    logStep(`Using ${mode} mode with key: ${keyName}`, { hasKey: !!key });
    return key;
  } catch (error) {
    logStep("Exception in getStripeKey", { error: error.message });
    return null;
  }
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
    logStep("Function started");

    const stripeKey = await getStripeKey(supabaseClient);
    if (!stripeKey) {
      logStep("Stripe key not found");
      throw new Error("Stripe secret key is not set");
    }
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      
      // Update only customers table
      await supabaseClient
        .from('customers')
        .update({
          vip_type: 'none',
          subscription_status: 'inactive',
          vip_expires_at: null,
          daily_downloads_remaining: 5,
          unlimited_downloads: false
        })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        vip_type: 'none'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Get payment settings to determine correct price IDs
    const { data: settings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError) {
      logStep("Error fetching payment settings for price matching", { error: settingsError.message });
      // Continue with basic VIP detection without price matching
    }

    let vipType = 'none';
    let subscriptionEnd = null;
    let isActive = false;
    let unlimitedDownloads = false;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      // Fix: Check if current_period_end exists and is valid before creating date
      if (subscription.current_period_end && subscription.current_period_end > 0) {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }
      isActive = true;
      
      // Determine VIP type based on current payment mode and price IDs
      const priceId = subscription.items.data[0].price.id;
      const mode = settings?.mode || 'test';
      
      if (mode === 'test') {
        if (priceId === settings?.test_monthly_price_id) {
          vipType = 'monthly';
        } else if (priceId === settings?.test_yearly_price_id) {
          vipType = 'yearly';
        } else if (priceId === settings?.test_lifetime_price_id) {
          vipType = 'lifetime';
          unlimitedDownloads = true;
        }
      } else {
        if (priceId === settings?.live_monthly_price_id) {
          vipType = 'monthly';
        } else if (priceId === settings?.live_yearly_price_id) {
          vipType = 'yearly';
        } else if (priceId === settings?.live_lifetime_price_id) {
          vipType = 'lifetime';
          unlimitedDownloads = true;
        }
      }
      
      logStep("Active subscription found", { subscriptionId: subscription.id, vipType, endDate: subscriptionEnd });
    } else {
      // Check for one-time lifetime purchases
      const charges = await stripe.charges.list({
        customer: customerId,
        limit: 50,
      });

      // Check for successful charges that match lifetime price
      const lifetimeCharge = charges.data.find(charge => 
        charge.status === 'succeeded' && 
        (charge.amount === 5999 || charge.amount === 59990) // Support both $59.99 formats
      );

      if (lifetimeCharge) {
        vipType = 'lifetime';
        isActive = true;
        unlimitedDownloads = true;
        subscriptionEnd = null;
        logStep("Lifetime purchase found", { chargeId: lifetimeCharge.id });
      } else {
        logStep("No active subscription or lifetime purchase found");
      }
    }

    // Determine daily downloads based on VIP type
    let dailyDownloads = 5; // Default for non-VIP
    if (isActive) {
      if (vipType === 'lifetime') {
        dailyDownloads = 999999; // Unlimited downloads
      } else if (vipType === 'yearly') {
        dailyDownloads = 30;
      } else if (vipType === 'monthly') {
        dailyDownloads = 20;
      }
    }

    // Update only customers table
    await supabaseClient
      .from('customers')
      .update({
        vip_type: vipType,
        subscription_status: isActive ? 'active' : 'inactive',
        vip_expires_at: subscriptionEnd,
        daily_downloads_remaining: dailyDownloads,
        unlimited_downloads: unlimitedDownloads
      })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({
      subscribed: isActive,
      vip_type: vipType,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});