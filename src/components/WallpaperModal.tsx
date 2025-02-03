import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Download, X } from "lucide-react";
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
        // Increment download count for user
        await supabase
          .from('users')
          .update({
            download_count: (userData.download_count || 0) + 1
          })
          .eq('id', session.user.id);
      }

      // Increment wallpaper download count
      const { error: wallpaperError } = await supabase
        .from('wallpapers')
        .update({
          download_count: (wallpaper.download_count || 0) + 1
        })
        .eq('id', wallpaper.id);

      if (wallpaperError) throw wallpaperError;

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden border-0 bg-transparent">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 hover:bg-black/70 border-0 h-14 w-14"
            onClick={onClose}
          >
            <X className="h-7 w-7 text-white" />
          </Button>
          <img
            src={wallpaper.url}
            alt={`Wallpaper ${wallpaper.id}`}
            className="w-full h-auto max-h-[95vh] object-contain"
          />
          <div className="absolute left-0 right-0 bottom-[15%] flex justify-center gap-8">
            <Button
              variant="secondary"
              size="icon"
              className={`rounded-full bg-black/50 hover:bg-black/70 border-0 h-14 w-14 ${
                isLiked ? 'bg-red-500/50 hover:bg-red-500/70' : ''
              }`}
              onClick={() => onLike(wallpaper.id)}
            >
              <Heart className={`h-7 w-7 text-white ${isLiked ? 'fill-white' : ''}`} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-black/50 hover:bg-black/70 border-0 h-14 w-14"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="h-7 w-7 text-white" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WallpaperModal;