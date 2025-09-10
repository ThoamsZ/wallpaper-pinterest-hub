
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useWallpaperDetails } from "@/hooks/use-wallpaper-details";
import { useWallpaperLikes } from "@/hooks/use-wallpaper-likes";
import { useDownloadLimits } from "@/hooks/use-download-limits";
import { Button } from "@/components/ui/button";
import { Heart, Download, Link as LinkIcon, ArrowLeft, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WallpaperGrid from "@/components/WallpaperGrid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";
import { downloadWallpaper } from "@/utils/download-utils";

const WallpaperPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const { likedWallpapers, handleLike } = useWallpaperLikes();
  const { downloadsRemaining, decrementDownloads } = useDownloadLimits();
  const [creatorInfo, setCreatorInfo] = useState<{ creator_code: string | null } | null>(null);
  
  const { 
    wallpaper, 
    isLoading, 
    error, 
    similarWallpapers,
    isSimilarLoading
  } = useWallpaperDetails(id);

  const isLiked = wallpaper ? likedWallpapers.includes(wallpaper.id) : false;

  // Fetch creator info when wallpaper data is available
  useEffect(() => {
    const fetchCreatorInfo = async () => {
      if (!wallpaper?.uploaded_by) return;
      
      const { data, error } = await supabase
        .from('creators')
        .select('creator_code')
        .eq('user_id', wallpaper.uploaded_by)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching creator info:', error);
        return;
      }
      
      setCreatorInfo(data);
    };
    
    fetchCreatorInfo();
  }, [wallpaper]);

  // Handle back button navigation
  const handleBackNavigation = () => {
    // Invalidate the wallpapers query to force a fresh load on the home page
    queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
    
    // Check if there's a previous page in history
    if (location.key !== "default") {
      navigate(-1);
    } else {
      // If no history, go to home
      navigate('/');
    }
  };

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
    
    const result = await downloadWallpaper(wallpaper.id, decrementDownloads, downloadsRemaining);
    
    if (!result.success && (result.message === "Authentication required" || result.message === "Guest account")) {
      navigate('/auth');
    }
    
    setIsDownloading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header isDisabled={false} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 flex-grow py-6">
        {isLoading ? (
          <div className="w-full flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : wallpaper ? (
          <>
            <Button 
              variant="ghost" 
              className="mb-4 flex items-center gap-2" 
              onClick={handleBackNavigation}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
              {/* Center Wallpaper */}
              <div className="flex justify-center flex-1">
                <Card className="overflow-hidden bg-gray-800 max-w-full w-auto">
                  <CardContent className="p-0 flex justify-center">
                    <img
                      src={(() => {
                        // 如果有r2_key，使用R2公共域名
                        const r2PublicUrl = wallpaper.r2_key ? 
                          `https://pub-a16d17b142a64b8cb94ff08966efe9ca.r2.dev/${wallpaper.r2_key}` : 
                          null;
                        
                        const imageUrl = r2PublicUrl || wallpaper.url;
                        
                        console.log(`Loading wallpaper page image for ${wallpaper.id}:`, {
                          r2_key: wallpaper.r2_key,
                          r2PublicUrl,
                          imageUrl,
                          url: wallpaper.url
                        });
                        return imageUrl;
                      })()}
                      alt={`Wallpaper ${wallpaper.id}`}
                      className="max-w-full h-auto object-contain max-h-[70vh]"
                      onContextMenu={handleContextMenu}
                      onDragStart={handleDragStart}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar */}
              <div className="w-full md:w-64 space-y-6">
                {/* Creator Info */}
                {creatorInfo?.creator_code && (
                  <div>
                    <h2 className="text-lg font-medium mb-2">Uploaded By</h2>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 w-full justify-start"
                      onClick={() => navigate(`/creator/${creatorInfo.creator_code}`)}
                    >
                      <User className="h-4 w-4" />
                      <span>{creatorInfo.creator_code}</span>
                    </Button>
                  </div>
                )}

                {/* Tags */}
                <div>
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

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <Button
                    variant="secondary"
                    className={`w-full justify-start gap-2 ${
                      isLiked ? 'bg-red-500/20 hover:bg-red-500/30' : ''
                    }`}
                    onClick={() => handleLike(wallpaper.id)}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  <Button
                    variant="default"
                    className="w-full justify-start gap-2"
                    onClick={handleDownload}
                    disabled={isDownloading || (downloadsRemaining !== null && downloadsRemaining <= 0)}
                  >
                    <Download className="h-5 w-5" />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-start gap-2"
                    onClick={copyLinkToClipboard}
                  >
                    <LinkIcon className="h-5 w-5" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            {/* Similar Wallpapers */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Similar Wallpapers</h2>
              {isSimilarLoading ? (
                <div className="w-full flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : similarWallpapers && similarWallpapers.length > 0 ? (
                <WallpaperGrid wallpapers={similarWallpapers} />
              ) : (
                <p className="text-muted-foreground text-center py-6">No similar wallpapers found</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-10">
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
