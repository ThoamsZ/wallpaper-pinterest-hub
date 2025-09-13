import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from '../_shared/cors.ts'

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Get the correct Stripe key based on payment mode
const getStripeKey = async (supabaseClient: any) => {
  const { data: settings } = await supabaseClient
    .from('payment_settings')
    .select('mode')
    .limit(1)
    .single();
  
  const mode = settings?.mode || 'test';
  const keyName = mode === 'live' ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY';
  const key = Deno.env.get(keyName);
  
  logStep(`Using ${mode} mode with key: ${keyName}`);
  return key;
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

    const { priceId } = await req.json();
    if (!priceId) throw new Error("Price ID is required");
    logStep("Request body parsed", { priceId });

    const stripeKey = await getStripeKey(supabaseClient);
    if (!stripeKey) throw new Error("Stripe secret key is not set");
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
    logStep("Stripe client initialized");

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Determine if this is a subscription or one-time payment
    const { data: settings } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .limit(1)
      .single();

    const mode = settings?.mode || 'test';
    const lifetimePriceId = mode === 'test' ? settings?.test_lifetime_price_id : settings?.live_lifetime_price_id;
    const isLifetime = priceId === lifetimePriceId;

    logStep("Creating checkout session", { 
      mode: isLifetime ? "payment" : "subscription", 
      priceId, 
      hasCustomer: !!customerId 
    });

    const sessionData: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isLifetime ? "payment" : "subscription",
      success_url: `${req.headers.get("origin")}/subscription?success=true`,
      cancel_url: `${req.headers.get("origin")}/subscription?canceled=true`,
    };

    const session = await stripe.checkout.sessions.create(sessionData);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});