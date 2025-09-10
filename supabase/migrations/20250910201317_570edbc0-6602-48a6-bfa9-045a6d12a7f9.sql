-- Allow public read access to active, non-blocked creators for profile viewing
CREATE POLICY "Allow public read access to active creators" 
ON public.creators 
FOR SELECT 
USING (is_active = true AND NOT is_blocked AND creator_code IS NOT NULL);