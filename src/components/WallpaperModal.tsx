
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Download, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useDownloadLimits } from "@/hooks/use-download-limits";
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
  const navigate = useNavigate();
  const { downloadsRemaining, decrementDownloads } = useDownloadLimits();

  // Disable F12 and other keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+U (view source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        return false;
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Handle context menu (right click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

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
        navigate('/auth');
        return;
      }

      // Check if user is guest
      if (session.user.email === 'guest@wallpaperhub.com') {
        toast({
          title: "Guest account",
          description: "Please sign up to download wallpapers",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Check download limits
      if (downloadsRemaining !== null && downloadsRemaining <= 0) {
        toast({
          title: "Daily download limit reached",
          description: "Please wait until tomorrow or upgrade your subscription for more downloads",
          variant: "destructive",
        });
        return;
      }

      // Increment wallpaper download count
      const { error: wallpaperError } = await supabase
        .from('wallpapers')
        .update({
          download_count: (wallpaper.download_count || 0) + 1
        })
        .eq('id', wallpaper.id);

      if (wallpaperError) throw wallpaperError;

      // Decrement user's remaining downloads
      await decrementDownloads();

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
        description: downloadsRemaining !== null ? 
          `You have ${downloadsRemaining - 1} downloads remaining today` : 
          "Your wallpaper is being downloaded",
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
        <DialogTitle className="sr-only">Wallpaper Preview</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative">
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
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
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
                disabled={isDownloading || (downloadsRemaining !== null && downloadsRemaining <= 0)}
              >
                <Download className="h-7 w-7 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WallpaperModal;
