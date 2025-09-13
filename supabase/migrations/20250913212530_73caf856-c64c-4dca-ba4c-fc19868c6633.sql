-- Create payment mode settings table
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
CREATE POLICY "Admins can manage payment settings" 
ON public.payment_settings 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Anyone can read payment settings" 
ON public.payment_settings 
FOR SELECT 
USING (true);

-- Insert default settings
INSERT INTO public.payment_settings (
  mode,
  test_monthly_price_id,
  test_yearly_price_id,
  test_lifetime_price_id
) VALUES (
  'test',
  'price_1S70IWD4StWDh7sZUWXlE3SV',
  'price_1S70IsD4StWDh7sZ7Xu0o461',
  'price_1S70JDD4StWDh7sZSmdNnAwt'
);

-- Update users table to support unlimited downloads for lifetime users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS unlimited_downloads boolean DEFAULT false;