
-- Function to safely remove a wallpaper from all users' favor_image arrays
CREATE OR REPLACE FUNCTION public.remove_wallpaper_from_favorites(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the favor_image array for all users who have this wallpaper in their favorites
  UPDATE public.users
  SET favor_image = array_remove(favor_image, wallpaper_id)
  WHERE favor_image @> ARRAY[wallpaper_id];
END;
$$;
