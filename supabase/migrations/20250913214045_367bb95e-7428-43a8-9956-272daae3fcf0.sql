-- Create payment_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  test_monthly_price_id text,
  test_yearly_price_id text,
  test_lifetime_price_id text,
  live_monthly_price_id text,
  live_yearly_price_id text,
  live_lifetime_price_id text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read payment settings" 
ON public.payment_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage payment settings" 
ON public.payment_settings 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- Insert default settings if none exist
INSERT INTO public.payment_settings (
  mode,
  test_monthly_price_id,
  test_yearly_price_id,
  test_lifetime_price_id
) 
SELECT 
  'test',
  'price_1S70IWD4StWDh7sZUWXlE3SV',
  'price_1S70IsD4StWDh7sZ7Xu0o461',
  'price_1S70JDD4StWDh7sZSmdNnAwt'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings);

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