-- Create function to get payment settings (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_payment_settings()
RETURNS TABLE(
  id uuid,
  mode text,
  test_monthly_price_id text,
  test_yearly_price_id text,
  test_lifetime_price_id text,
  live_monthly_price_id text,
  live_yearly_price_id text,
  live_lifetime_price_id text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT 
    ps.id,
    ps.mode,
    ps.test_monthly_price_id,
    ps.test_yearly_price_id,
    ps.test_lifetime_price_id,
    ps.live_monthly_price_id,
    ps.live_yearly_price_id,
    ps.live_lifetime_price_id,
    ps.created_at,
    ps.updated_at
  FROM payment_settings ps
  LIMIT 1;
$$;