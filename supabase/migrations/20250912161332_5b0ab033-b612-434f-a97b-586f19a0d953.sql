-- Remove guest user from creators table for security
DELETE FROM creators WHERE user_id = '211ab759-f1f0-4329-8979-b3fe3466cd16';

-- Create a proper creator account
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES (
  gen_random_uuid(),
  'creator@wallpaperhub.com', 
  crypt('creator123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Add the new creator user to creators table
INSERT INTO creators (user_id, email, is_active, is_blocked)
SELECT id, 'creator@wallpaperhub.com', true, false
FROM auth.users
WHERE email = 'creator@wallpaperhub.com';