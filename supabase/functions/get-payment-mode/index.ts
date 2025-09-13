import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from '../_shared/cors.ts'

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
    // Get payment settings
    const { data: settings, error } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching payment settings:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({
      mode: settings.mode,
      prices: {
        monthly: settings.mode === 'test' ? settings.test_monthly_price_id : settings.live_monthly_price_id,
        yearly: settings.mode === 'test' ? settings.test_yearly_price_id : settings.live_yearly_price_id,
        lifetime: settings.mode === 'test' ? settings.test_lifetime_price_id : settings.live_lifetime_price_id
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});