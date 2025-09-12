-- Update wallpapers RLS policies to allow admins to see all wallpapers
DROP POLICY IF EXISTS "Admins can view all wallpapers" ON wallpapers;

CREATE POLICY "Admins can view all wallpapers" 
ON wallpapers 
FOR SELECT 
USING (is_admin());