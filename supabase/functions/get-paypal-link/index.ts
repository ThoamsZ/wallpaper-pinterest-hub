
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get PayPal payment link from payment_links table
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

    const paypalLink = linkData.url.trim();
    if (!paypalLink || !paypalLink.startsWith('http')) {
      console.error('Invalid PayPal payment link format:', paypalLink);
      throw new Error('Invalid PayPal payment link configuration');
    }

    return new Response(
      JSON.stringify({ paypalLink }),
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

