
import { useParams, useNavigate } from "react-router-dom";
import { useWallpaperDetails } from "@/hooks/use-wallpaper-details";
import { useWallpaperLikes } from "@/hooks/use-wallpaper-likes";
import { useDownloadLimits } from "@/hooks/use-download-limits";
import { Button } from "@/components/ui/button";
import { Heart, Download, Link, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WallpaperGrid from "@/components/WallpaperGrid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/App";

const WallpaperPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const { likedWallpapers, handleLike } = useWallpaperLikes();
  const { downloadsRemaining, decrementDownloads } = useDownloadLimits();
  
  const { 
    wallpaper, 
    isLoading, 
    error, 
    similarWallpapers,
    isSimilarLoading
  } = useWallpaperDetails(id);

  const isLiked = wallpaper ? likedWallpapers.includes(wallpaper.id) : false;

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Could not load the wallpaper. It may have been removed.",
        variant: "destructive",
      });
      navigate("/", { replace: true });
    }
  }, [error, navigate]);

  // Prevent context menu and dragging
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  const copyLinkToClipboard = () => {
    if (!wallpaper) return;
    
    const wallpaperUrl = `${window.location.origin}/wallpaper/${wallpaper.id}`;
    navigator.clipboard.writeText(wallpaperUrl)
      .then(() => {
        toast({
          title: "Link copied",
          description: "Wallpaper link copied to clipboard",
        });
      })
      .catch(() => {
        toast({
          title: "Copy failed",
          description: "Could not copy the link to clipboard",
          variant: "destructive",
        });
      });
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header isDisabled={false} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
        {isLoading ? (
          <div className="w-full flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : wallpaper ? (
          <div className="py-8">
            <Button 
              variant="ghost" 
              className="mb-6 flex items-center gap-2" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Wallpaper Image */}
              <div className="relative rounded-lg overflow-hidden bg-gray-800">
                <img
                  src={wallpaper.url}
                  alt={`Wallpaper ${wallpaper.id}`}
                  className="w-full h-auto object-contain"
                  onContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                />
              </div>

              {/* Wallpaper Info */}
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold mb-4">Wallpaper</h1>
                
                {/* Tags */}
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-2">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {wallpaper.tags && wallpaper.tags.length > 0 ? (
                      wallpaper.tags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => navigate(`/?tag=${tag}`)}
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No tags available</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-2">Stats</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/30 p-3 rounded-lg">
                      <span className="text-muted-foreground">Downloads</span>
                      <p className="text-lg font-medium">{wallpaper.download_count || 0}</p>
                    </div>
                    <div className="bg-secondary/30 p-3 rounded-lg">
                      <span className="text-muted-foreground">Likes</span>
                      <p className="text-lg font-medium">{wallpaper.like_count || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    className={`rounded-full flex items-center gap-2 ${
                      isLiked ? 'bg-red-500/20 hover:bg-red-500/30' : ''
                    }`}
                    onClick={() => handleLike(wallpaper.id)}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  <Button
                    variant="default"
                    size="lg"
                    className="rounded-full flex items-center gap-2"
                    onClick={handleDownload}
                    disabled={isDownloading || (downloadsRemaining !== null && downloadsRemaining <= 0)}
                  >
                    <Download className="h-5 w-5" />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="rounded-full flex items-center gap-2"
                    onClick={copyLinkToClipboard}
                  >
                    <Link className="h-5 w-5" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            {/* Similar Wallpapers */}
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6">Similar Wallpapers</h2>
              {isSimilarLoading ? (
                <div className="w-full flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : similarWallpapers && similarWallpapers.length > 0 ? (
                <WallpaperGrid wallpapers={similarWallpapers} />
              ) : (
                <p className="text-muted-foreground text-center py-10">No similar wallpapers found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Wallpaper not found</h2>
            <p className="text-muted-foreground mb-6">The wallpaper you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default WallpaperPage;
