import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PRODUCTS] ${step}${detailsStr}`);
};

const getStripeKey = async (supabaseClient: any) => {
  // Get payment settings to determine mode
  const { data: settings, error } = await supabaseClient
    .from('payment_settings')
    .select('mode')
    .limit(1)
    .single();

  if (error) {
    logStep("Error fetching payment settings for mode", { error: error.message });
    return null;
  }

  const mode = settings?.mode || 'test';
  const keyName = mode === 'live' ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY';
  const key = Deno.env.get(keyName);
  
  logStep(`Using ${mode} mode with key: ${keyName}`, { hasKey: !!key });
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

    const stripeKey = await getStripeKey(supabaseClient);
    if (!stripeKey) throw new Error("Stripe secret key is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch all products
    logStep("Fetching products from Stripe");
    const products = await stripe.products.list({ limit: 100, active: true });
    logStep("Products fetched", { count: products.data.length });

    // Fetch all prices
    logStep("Fetching prices from Stripe");
    const prices = await stripe.prices.list({ limit: 100, active: true });
    logStep("Prices fetched", { count: prices.data.length });

    // Organize the data
    const organized = {
      products: products.data.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        created: product.created,
        metadata: product.metadata
      })),
      prices: prices.data.map(price => ({
        id: price.id,
        product: price.product,
        amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
        type: price.type,
        active: price.active,
        created: price.created,
        metadata: price.metadata
      })),
      summary: {
        total_products: products.data.length,
        total_prices: prices.data.length,
        recurring_prices: prices.data.filter(p => p.type === 'recurring').length,
        one_time_prices: prices.data.filter(p => p.type === 'one_time').length
      }
    };

    logStep("Data organized successfully", organized.summary);

    return new Response(JSON.stringify(organized, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-products", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});