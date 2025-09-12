-- Add guest user as creator for testing
INSERT INTO creators (user_id, email, is_active, is_blocked) 
VALUES ('211ab759-f1f0-4329-8979-b3fe3466cd16', 'guest@wallpaperhub.com', true, false)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  is_active = EXCLUDED.is_active,
  is_blocked = EXCLUDED.is_blocked;