-- Remove users table dependencies and fix customers table RLS
-- First, ensure customers table has all needed columns
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS unlimited_downloads boolean DEFAULT false;

-- Update customers table RLS policies to be more permissive for service operations
DROP POLICY IF EXISTS "Customers can view their own data" ON public.customers;
DROP POLICY IF EXISTS "Customers can update their own data" ON public.customers;

-- Create new RLS policies for customers table
CREATE POLICY "Users can view their own customer data" 
ON public.customers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer data" 
ON public.customers 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can manage customer data" 
ON public.customers 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- Create security definer function to get customer VIP status
CREATE OR REPLACE FUNCTION public.get_customer_vip_status(customer_user_id uuid)
RETURNS TABLE(
  vip_type text,
  subscription_status text,
  vip_expires_at timestamp with time zone,
  unlimited_downloads boolean,
  daily_downloads_remaining integer
) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT 
    c.vip_type,
    c.subscription_status,
    c.vip_expires_at,
    c.unlimited_downloads,
    c.daily_downloads_remaining
  FROM customers c
  WHERE c.user_id = customer_user_id;
$$;