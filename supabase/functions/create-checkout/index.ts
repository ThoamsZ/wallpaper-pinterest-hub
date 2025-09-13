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
    console.log("=== Checkout Function Started ===");
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    console.log("Authenticated user:", user.email);

    // Get request body
    const { priceId } = await req.json();
    if (!priceId) {
      throw new Error("priceId is required");
    }
    
    console.log("Received priceId:", priceId);

    // Initialize Stripe with correct API version
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-06-20",
    });

    // Handle product ID conversion if needed
    let finalPriceId = priceId;
    if (priceId.startsWith("prod_")) {
      console.log("Converting product ID to price ID...");
      try {
        const prices = await stripe.prices.list({
          product: priceId,
          active: true,
          limit: 1,
        });
        
        if (prices.data.length === 0) {
          throw new Error(`No active price found for product ${priceId}`);
        }
        
        finalPriceId = prices.data[0].id;
        console.log("Converted to price ID:", finalPriceId);
      } catch (priceError) {
        console.error("Error fetching price:", priceError);
        throw new Error(`Invalid product ID: ${priceId}`);
      }
    }

    // Check if customer exists in Stripe
    let customerId = null;
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Found existing customer:", customerId);
      } else {
        console.log("No existing customer found");
      }
    } catch (customerError) {
      console.error("Error checking customer:", customerError);
      // Continue without existing customer
    }

    // Create checkout session
    console.log("Creating checkout session...");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      success_url: `${req.headers.get("origin") || "http://localhost:3000"}/subscription?success=true`,
      cancel_url: `${req.headers.get("origin") || "http://localhost:3000"}/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    console.log("Checkout session created successfully:", session.id);
    console.log("Checkout URL:", session.url);

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== Checkout Error ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      details: error.toString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});