
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user session from the request
    const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
    
    if (authError || !session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the PayPal link from secrets table
    const { data, error } = await supabaseClient
      .from('secrets')
      .select('value')
      .eq('name', 'PAYPAL_LIFETIME_LINK')
      .single();

    if (error) {
      console.error('Error fetching PayPal link:', error);
      throw new Error('Failed to fetch PayPal payment link');
    }

    if (!data?.value) {
      throw new Error('PayPal payment link not found');
    }

    return new Response(
      JSON.stringify({ paypalLink: data.value }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
