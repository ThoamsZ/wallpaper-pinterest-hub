import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

interface WallpaperModalProps {
  wallpaper: Wallpaper | null;
  isOpen: boolean;
  onClose: () => void;
  onLike: (wallpaperId: string) => void;
  isLiked: boolean;
}

const WallpaperModal = ({ wallpaper, isOpen, onClose, onLike, isLiked }: WallpaperModalProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!wallpaper) return;
    
    setIsDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please login to download wallpapers",
          variant: "destructive",
        });
        return;
      }

      // Check download limit
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('download_count, last_download_reset, subscription_status')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      const now = new Date();
      const lastReset = userData.last_download_reset ? new Date(userData.last_download_reset) : null;
      const isNewDay = !lastReset || now.getDate() !== lastReset.getDate();

      if (isNewDay) {
        // Reset counter for new day
        await supabase
          .from('users')
          .update({
            download_count: 1,
            last_download_reset: now.toISOString()
          })
          .eq('id', session.user.id);
      } else if (userData.subscription_status !== 'active' && userData.download_count >= 3) {
        toast({
          title: "Download limit reached",
          description: "Free users can only download 3 wallpapers per day",
          variant: "destructive",
        });
        return;
      } else {
        // Increment download count
        await supabase
          .from('users')
          .update({
            download_count: (userData.download_count || 0) + 1
          })
          .eq('id', session.user.id);
      }

      // Trigger download
      const response = await fetch(wallpaper.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallpaper-${wallpaper.id}.${wallpaper.url.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your wallpaper is being downloaded",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the wallpaper",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!wallpaper) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <div className="relative flex flex-col items-center">
          <img
            src={wallpaper.url}
            alt={`Wallpaper ${wallpaper.id}`}
            className="w-full h-auto max-h-[75vh] object-contain"
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className={`${isLiked ? 'bg-red-100 hover:bg-red-200' : ''}`}
              onClick={() => onLike(wallpaper.id)}
            >
              <Heart className={`${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
          <div className="w-full p-6 bg-background">
            <div className="flex flex-col gap-4">
              {wallpaper.tags && wallpaper.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wallpaper.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-secondary/20 text-secondary-foreground rounded-md text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-center">
                <Button 
                  onClick={handleDownload} 
                  disabled={isDownloading}
                  className="w-full max-w-md"
                >
                  {isDownloading ? "Downloading..." : "Download"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WallpaperModal;