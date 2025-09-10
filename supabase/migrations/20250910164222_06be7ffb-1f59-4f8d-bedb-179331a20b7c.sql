-- Fix remaining functions without proper search_path
CREATE OR REPLACE FUNCTION public.remove_wallpaper_from_favorites(wallpaper_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Update the users table to remove the wallpaper from the favor_image array
  UPDATE users
  SET favor_image = array_remove(favor_image, wallpaper_id)
  WHERE favor_image @> ARRAY[wallpaper_id];
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_tag_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    tag_item text;
    tags_array text[];
BEGIN
    -- Get the tags array for the downloaded wallpaper
    SELECT tags INTO tags_array FROM wallpapers WHERE id = NEW.id;
    
    -- For each tag in the array
    IF tags_array IS NOT NULL THEN
        FOREACH tag_item IN ARRAY tags_array LOOP
            -- Insert or update the tag stats
            INSERT INTO tags_stats (tag, download_count)
            VALUES (tag_item, 1)
            ON CONFLICT (tag)
            DO UPDATE SET 
                download_count = tags_stats.download_count + 1,
                last_updated = timezone('utc'::text, now());
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_vip(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT 
    CASE 
      WHEN vip_type = 'lifetime' THEN true
      WHEN vip_type IN ('monthly', 'yearly') AND vip_expires_at > now() THEN true
      ELSE false
    END
  FROM users
  WHERE id = user_id;
$function$;