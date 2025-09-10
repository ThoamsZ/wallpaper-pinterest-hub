-- Fix infinite recursion in admin_users RLS policy

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Admin users can read admin data" ON public.admin_users;

-- Create a security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND admin_type IN ('admin', 'admin_manager') 
    AND NOT is_blocked
  );
$$;

-- Create a new policy using the security definer function
CREATE POLICY "Admin users can read admin data" 
ON public.admin_users 
FOR SELECT 
USING (public.is_admin_user());