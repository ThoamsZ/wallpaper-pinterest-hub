-- Add R2 support columns to wallpapers table
ALTER TABLE wallpapers 
ADD COLUMN IF NOT EXISTS r2_key TEXT,
ADD COLUMN IF NOT EXISTS r2_url TEXT,
ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP WITH TIME ZONE;

-- Create download logs table for tracking downloads
CREATE TABLE IF NOT EXISTS download_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  wallpaper_id UUID REFERENCES wallpapers(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on download_logs
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for download_logs
CREATE POLICY "Users can view their own download logs" 
ON download_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert download logs" 
ON download_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_download_logs_user_id ON download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_wallpaper_id ON download_logs(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_downloaded_at ON download_logs(downloaded_at);

-- Create index for R2 migration queries
CREATE INDEX IF NOT EXISTS idx_wallpapers_r2_key ON wallpapers(r2_key) WHERE r2_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallpapers_migrated ON wallpapers(migrated_at) WHERE migrated_at IS NOT NULL;