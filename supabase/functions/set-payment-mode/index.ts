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
    const { mode, prices } = await req.json();

    if (!mode || !['test', 'live'].includes(mode)) {
      throw new Error('Invalid mode. Must be "test" or "live"');
    }

    const updateData: any = { mode };

    if (prices) {
      if (mode === 'test') {
        if (prices.monthly) updateData.test_monthly_price_id = prices.monthly;
        if (prices.yearly) updateData.test_yearly_price_id = prices.yearly;
        if (prices.lifetime) updateData.test_lifetime_price_id = prices.lifetime;
      } else {
        if (prices.monthly) updateData.live_monthly_price_id = prices.monthly;
        if (prices.yearly) updateData.live_yearly_price_id = prices.yearly;
        if (prices.lifetime) updateData.live_lifetime_price_id = prices.lifetime;
      }
    }

    const { data, error } = await supabaseClient
      .from('payment_settings')
      .update(updateData)
      .eq('id', (await supabaseClient.from('payment_settings').select('id').limit(1).single()).data?.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, data }), {
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