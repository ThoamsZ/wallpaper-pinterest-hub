-- Fix critical security issues - restrict public access to sensitive data

-- Fix users table - remove public read policies and keep only user-specific access
DROP POLICY IF EXISTS "Users can read creator codes" ON public.users;

-- Fix secrets table - remove public access completely
DROP POLICY IF EXISTS "Allow anonymous read access to secrets" ON public.secrets;
DROP POLICY IF EXISTS "Allow anyone to read PayPal client ID" ON public.secrets;
DROP POLICY IF EXISTS "Authenticated users can read specific secrets" ON public.secrets;

-- Create secure policy for PayPal client ID only (needed for frontend)
CREATE POLICY "Allow reading PayPal client ID only" 
ON public.secrets 
FOR SELECT 
USING (name = 'PAYPAL_CLIENT_ID');

-- Fix admin_users table - remove public read policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.admin_users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.admin_users;
DROP POLICY IF EXISTS "Enable reading admin users" ON public.admin_users;

-- Create secure admin access policy
CREATE POLICY "Admin users can read admin data" 
ON public.admin_users 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() 
  AND au.admin_type IN ('admin', 'admin_manager') 
  AND NOT au.is_blocked
));