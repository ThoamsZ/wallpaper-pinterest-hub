
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallpapers } from "@/hooks/use-wallpapers";
import { deleteWallpaper } from "@/utils/wallpaper-utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash, Check, Loader2 } from "lucide-react";

const WallpaperControl = () => {
  const navigate = useNavigate();
  const { wallpapers, isLoading, fetchNextPage, hasNextPage } = useWallpapers();
  const [selectedWallpapers, setSelectedWallpapers] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID if available
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }
    };
    
    getUserId();
  }, []);

  // Remove admin check to allow anyone to access this page for now

  const toggleSelectWallpaper = (wallpaperId: string) => {
    setSelectedWallpapers(prev => 
      prev.includes(wallpaperId) 
        ? prev.filter(id => id !== wallpaperId) 
        : [...prev, wallpaperId]
    );
  };

  const selectAll = () => {
    if (selectedWallpapers.length === wallpapers.length) {
      setSelectedWallpapers([]);
    } else {
      setSelectedWallpapers(wallpapers.map(w => w.id));
    }
  };

  const handleDeleteSingle = async (wallpaperId: string) => {
    try {
      setIsDeleting(true);
      const success = await deleteWallpaper(wallpaperId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Wallpaper deleted successfully",
        });
        // Remove from selected wallpapers if it was selected
        setSelectedWallpapers(prev => prev.filter(id => id !== wallpaperId));
        // Refresh the page to update the wallpaper list
        window.location.reload();
      } else {
        throw new Error("Failed to delete wallpaper");
      }
    } catch (error) {
      console.error("Error deleting wallpaper:", error);
      toast({
        title: "Error",
        description: "Failed to delete wallpaper. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedWallpapers.length === 0) {
      toast({
        title: "No wallpapers selected",
        description: "Please select at least one wallpaper to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);
      let successCount = 0;
      let failCount = 0;

      for (const wallpaperId of selectedWallpapers) {
        const success = await deleteWallpaper(wallpaperId);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} wallpaper(s) deleted successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        });
        setSelectedWallpapers([]);
        // Refresh the page to update the wallpaper list
        window.location.reload();
      } else {
        throw new Error("Failed to delete wallpapers");
      }
    } catch (error) {
      console.error("Error deleting wallpapers:", error);
      toast({
        title: "Error",
        description: "Failed to delete wallpapers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading wallpapers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Wallpaper Control</h1>
        <div className="flex space-x-4">
          <Button onClick={() => navigate("/admin-panel")}>Return to Admin Panel</Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={selectedWallpapers.length === 0 || isDeleting}
                className="flex items-center"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4 mr-2" />
                )}
                Delete Selected ({selectedWallpapers.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete {selectedWallpapers.length} selected wallpaper(s) and remove the data from the server.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={wallpapers.length > 0 && selectedWallpapers.length === wallpapers.length}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead className="w-20">Preview</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallpapers.map((wallpaper) => (
                <TableRow key={wallpaper.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedWallpapers.includes(wallpaper.id)}
                      onCheckedChange={() => toggleSelectWallpaper(wallpaper.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <img 
                      src={wallpaper.compressed_url} 
                      alt={`Wallpaper ${wallpaper.id}`} 
                      className="w-16 h-16 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[150px]">
                    {wallpaper.id}
                  </TableCell>
                  <TableCell>{wallpaper.type}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {wallpaper.tags?.map((tag, i) => (
                        <span 
                          key={i} 
                          className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full"
                          disabled={isDeleting}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this wallpaper and remove the data from the server.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSingle(wallpaper.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {hasNextPage && (
        <div className="flex justify-center mt-6">
          <Button 
            onClick={() => fetchNextPage()} 
            variant="outline"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default WallpaperControl;
