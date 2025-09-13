import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("Checking subscription for user:", user.email);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-06-20",
    });

    // Get payment settings first
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const { data: paymentSettings } = await supabaseService
      .from('payment_settings')
      .select('*')
      .limit(1)
      .single();

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      console.log("No customer found, user has no subscription");
      return new Response(JSON.stringify({ 
        subscribed: false,
        vip_type: "none",
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    console.log("Found Stripe customer:", customerId);

    let vipType = "none";
    let subscriptionEnd = null;
    let hasLifetimePayment = false;

    // First check for completed lifetime payments (checkout sessions)
    if (paymentSettings) {
      const lifetimeProductId = paymentSettings.mode === 'test' ? 
        paymentSettings.test_lifetime_price_id : 
        paymentSettings.live_lifetime_price_id;
      
      console.log("Checking for lifetime payments, product ID:", lifetimeProductId);
      
      // Check checkout sessions for lifetime purchases
      const checkoutSessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 20,
      });
      
      console.log("Found checkout sessions:", checkoutSessions.data.length);
      
      for (const session of checkoutSessions.data) {
        console.log("Session:", {
          id: session.id,
          status: session.status,
          mode: session.mode,
          metadata: session.metadata
        });
        
        // Check both metadata and line items for lifetime purchases
        const isLifetimeByMetadata = session.metadata?.plan_type === 'lifetime';
        
        // Also expand and check line items
        const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items.data.price.product']
        });
        
        const isLifetimeByProduct = expandedSession.line_items?.data.some(item => 
          item.price?.product === lifetimeProductId
        );
        
        if (session.status === 'complete' && (isLifetimeByMetadata || isLifetimeByProduct)) {
          hasLifetimePayment = true;
          vipType = "lifetime";
          console.log("Found completed lifetime checkout session:", session.id);
          break;
        }
      }
    }

    // Only check subscriptions if no lifetime payment found
    if (!hasLifetimePayment) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      const hasActiveSub = subscriptions.data.length > 0;

      if (hasActiveSub) {
        const subscription = subscriptions.data[0];
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Get price to determine VIP type
        const priceId = subscription.items.data[0].price.id;
        const productId = subscription.items.data[0].price.product;
        console.log("Active subscription price ID:", priceId);
        console.log("Active subscription product ID:", productId);
        
        if (paymentSettings) {
          const { mode } = paymentSettings;
          const monthlyId = mode === 'test' ? paymentSettings.test_monthly_price_id : paymentSettings.live_monthly_price_id;
          const yearlyId = mode === 'test' ? paymentSettings.test_yearly_price_id : paymentSettings.live_yearly_price_id;
          const lifetimeId = mode === 'test' ? paymentSettings.test_lifetime_price_id : paymentSettings.live_lifetime_price_id;
          
          // Map product IDs or price IDs to VIP types
          if (productId === monthlyId || priceId.includes(monthlyId)) {
            vipType = "monthly";
          } else if (productId === yearlyId || priceId.includes(yearlyId)) {
            vipType = "yearly";
          } else if (productId === lifetimeId || priceId.includes(lifetimeId)) {
            vipType = "lifetime";
          }
          
          console.log("Payment settings:", { mode, monthlyId, yearlyId, lifetimeId });
          console.log("Determined VIP type:", vipType);
        }
        
        console.log("Subscription active until:", subscriptionEnd, "VIP type:", vipType);
      } else {
        console.log("No active subscription found");
      }
    }

    // Update user's VIP status in database
    if (vipType !== "none") {
      const isLifetime = vipType === 'lifetime';
      const dailyDownloads = isLifetime ? 999999 : (vipType === 'yearly' ? 30 : 20);
      
      await supabaseService
        .from('customers')
        .update({
          vip_type: vipType,
          vip_expires_at: vipType === 'lifetime' ? null : subscriptionEnd,
          subscription_status: 'active',
          daily_downloads_remaining: dailyDownloads,
          unlimited_downloads: isLifetime
        })
        .eq('user_id', user.id);
      
      console.log("Updated user VIP status in database");
    }

    return new Response(JSON.stringify({
      subscribed: (vipType !== "none"),
      vip_type: vipType,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Check subscription error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});