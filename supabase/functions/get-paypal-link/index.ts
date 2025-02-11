
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('User ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Creating PayPal order...');

    // Create a new PayPal order using PayPal API
    const paypalAccessToken = Deno.env.get('PAYPAL_ACCESS_TOKEN');
    if (!paypalAccessToken) {
      throw new Error('PayPal access token not configured');
    }

    const orderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paypalAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '99.99'
          },
          description: 'Lifetime VIP Subscription'
        }]
      })
    });

    const orderData = await orderResponse.json();
    console.log('PayPal order created:', orderData);

    if (!orderData.id) {
      console.error('Failed to create PayPal order:', orderData);
      throw new Error('Failed to create PayPal order');
    }

    // Store order information in the database
    const { error: orderError } = await supabase
      .from('paypal_orders')
      .insert({
        order_id: orderData.id,
        user_id: user_id,
        amount: 99.99,
        status: 'pending'
      });

    if (orderError) {
      console.error('Error storing order:', orderError);
      throw new Error('Failed to store order information');
    }

    // Get PayPal payment link
    const { data: linkData, error: linkError } = await supabase
      .from('payment_links')
      .select('url')
      .eq('name', 'lifetime_subscription')
      .eq('is_active', true)
      .maybeSingle();

    console.log('Payment link fetch response:', { data: linkData, error: linkError });

    if (linkError) {
      console.error('Error fetching PayPal payment link:', linkError);
      throw new Error('Failed to fetch PayPal payment configuration');
    }

    if (!linkData?.url) {
      console.error('PayPal payment link not found or not active');
      throw new Error('PayPal payment link is not properly configured');
    }

    // Construct the full payment URL with the order ID
    const paymentUrl = `${linkData.url}?token=${orderData.id}`;

    return new Response(
      JSON.stringify({ 
        paypalLink: paymentUrl,
        orderId: orderData.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in get-paypal-link function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})
