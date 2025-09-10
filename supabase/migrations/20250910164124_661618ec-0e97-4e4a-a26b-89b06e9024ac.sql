-- Fix RLS disabled on paypal_one_time_payments table
ALTER TABLE public.paypal_one_time_payments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for paypal_one_time_payments
CREATE POLICY "Users can view their own one-time payments" 
ON public.paypal_one_time_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own one-time payments" 
ON public.paypal_one_time_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage one-time payments" 
ON public.paypal_one_time_payments 
FOR ALL 
USING (auth.role() = 'service_role');

-- Fix security definer functions by adding proper search_path
CREATE OR REPLACE FUNCTION public.reset_daily_downloads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE users SET 
    daily_downloads_remaining = 
      CASE 
        WHEN subscription_status = 'active' AND vip_type = 'yearly' THEN 30
        WHEN subscription_status = 'active' AND vip_type = 'monthly' THEN 20
        ELSE 5
      END,
    last_download_reset = timezone('utc'::text, now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_vip_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.users
    SET 
      vip_type = NEW.subscription_type,
      vip_expires_at = 
        CASE 
          WHEN NEW.subscription_type = 'monthly' THEN NOW() + INTERVAL '1 month'
          WHEN NEW.subscription_type = 'yearly' THEN NOW() + INTERVAL '1 year'
          WHEN NEW.subscription_type = 'lifetime' THEN NULL
        END,
      subscription_status = 'active',
      paypal_subscription_id = NEW.paypal_subscription_id,
      daily_downloads_remaining = 
        CASE 
          WHEN NEW.subscription_type = 'yearly' THEN 30
          WHEN NEW.subscription_type = 'monthly' THEN 20
          WHEN NEW.subscription_type = 'lifetime' THEN 30
          ELSE 5
        END
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    daily_downloads_remaining,
    vip_type,
    subscription_status
  )
  VALUES (
    new.id,
    new.email,
    5,  -- Default daily downloads
    'none',  -- Default VIP type
    'inactive'  -- Default subscription status
  );
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_lifetime_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'completed' THEN
    -- Update user's VIP status for lifetime access
    UPDATE public.users
    SET 
      vip_type = 'lifetime',
      vip_expires_at = NULL,
      subscription_status = 'active',
      daily_downloads_remaining = 30
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_paypal_order_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If the status changed to completed and we have webhook data
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.webhook_data IS NOT NULL THEN
    -- Extract transaction ID from webhook data if available
    NEW.transaction_id := (NEW.webhook_data->'purchase_units'->0->'payments'->'captures'->0->>'id')::text;
    
    -- Update the users table to grant lifetime access
    UPDATE public.users
    SET 
      vip_type = 'lifetime',
      vip_expires_at = NULL,
      subscription_status = 'active',
      daily_downloads_remaining = 30
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;