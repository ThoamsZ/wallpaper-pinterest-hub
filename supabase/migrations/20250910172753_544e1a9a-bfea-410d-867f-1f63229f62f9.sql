-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'creator', 'customer');

-- Create the new separated tables
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  creator_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES public.admins(id)
);

CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  vip_type TEXT DEFAULT 'none',
  vip_expires_at TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT DEFAULT 'inactive',
  daily_downloads_remaining INTEGER DEFAULT 5,
  last_download_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  download_count INTEGER DEFAULT 0,
  favor_image UUID[] DEFAULT ARRAY[]::uuid[],
  favor_collections UUID[] DEFAULT ARRAY[]::uuid[],
  paypal_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on all new tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create security definer functions for role checking
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_creator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creators 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND NOT is_blocked
  );
$$;

CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers 
    WHERE user_id = auth.uid()
  );
$$;

-- RLS Policies for admins table
CREATE POLICY "Admins can view all admin data" ON public.admins
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert admin data" ON public.admins
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update admin data" ON public.admins
  FOR UPDATE USING (public.is_admin());

-- RLS Policies for creators table
CREATE POLICY "Admins can view all creators" ON public.creators
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage creators" ON public.creators
  FOR ALL USING (public.is_admin());

CREATE POLICY "Creators can view their own data" ON public.creators
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Creators can update their own data" ON public.creators
  FOR UPDATE USING (user_id = auth.uid() AND public.is_creator());

-- RLS Policies for customers table
CREATE POLICY "Customers can view their own data" ON public.customers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Customers can update their own data" ON public.customers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all customers" ON public.customers
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL USING (public.is_admin());

-- Update wallpapers policies for creator permissions
DROP POLICY IF EXISTS "Allow authenticated users to upload wallpapers" ON public.wallpapers;
DROP POLICY IF EXISTS "Users can delete own wallpapers" ON public.wallpapers;

CREATE POLICY "Creators can upload wallpapers" ON public.wallpapers
  FOR INSERT WITH CHECK (public.is_creator() AND uploaded_by = auth.uid());

CREATE POLICY "Creators can delete their own wallpapers" ON public.wallpapers
  FOR DELETE USING (public.is_creator() AND uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all wallpapers" ON public.wallpapers
  FOR ALL USING (public.is_admin());

-- Migrate existing data from old tables to new structure
-- Handle null emails by providing a default value
INSERT INTO public.admins (user_id, email)
SELECT user_id, COALESCE(email, 'no-email-' || user_id::text || '@admin.com') 
FROM public.admin_users 
WHERE admin_type = 'admin_manager' OR admin_type = 'admin';

INSERT INTO public.creators (user_id, email, creator_code, is_blocked, created_at)
SELECT 
  au.user_id, 
  COALESCE(au.email, 'no-email-' || au.user_id::text || '@creator.com'), 
  u.creator_code,
  au.is_blocked,
  au.created_at
FROM public.admin_users au
LEFT JOIN public.users u ON au.user_id = u.id
WHERE au.admin_type = 'admin';

INSERT INTO public.customers (user_id, email, vip_type, vip_expires_at, subscription_status, daily_downloads_remaining, last_download_reset, download_count, favor_image, favor_collections, paypal_subscription_id, created_at)
SELECT 
  id,
  COALESCE(email, 'no-email-' || id::text || '@customer.com'),
  vip_type,
  vip_expires_at,
  subscription_status,
  daily_downloads_remaining,
  last_download_reset,
  download_count,
  favor_image,
  favor_collections,
  paypal_subscription_id,
  created_at
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.admin_users);

-- Create trigger function for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- By default, new users are customers
  INSERT INTO public.customers (user_id, email)
  VALUES (NEW.id, COALESCE(NEW.email, 'no-email-' || NEW.id::text || '@customer.com'));
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();