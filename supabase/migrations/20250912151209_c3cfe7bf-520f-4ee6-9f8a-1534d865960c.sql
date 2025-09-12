-- Add foreign key relationships for upload_requests and delete_requests

-- Add foreign key for upload_requests.requested_by -> creators.user_id
ALTER TABLE upload_requests 
ADD CONSTRAINT upload_requests_requested_by_fkey 
FOREIGN KEY (requested_by) REFERENCES creators(user_id) ON DELETE CASCADE;

-- Add foreign key for delete_requests.requested_by -> creators.user_id  
ALTER TABLE delete_requests 
ADD CONSTRAINT delete_requests_requested_by_fkey 
FOREIGN KEY (requested_by) REFERENCES creators(user_id) ON DELETE CASCADE;

-- Add foreign key for delete_requests.wallpaper_id -> wallpapers.id
ALTER TABLE delete_requests 
ADD CONSTRAINT delete_requests_wallpaper_id_fkey 
FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE;