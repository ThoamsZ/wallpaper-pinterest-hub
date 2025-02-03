import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CollectionManager } from "@/components/admin/CollectionManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Trash, Download, Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Wallpaper {
  id: string;
  url: string;
  type: string;
  file_path: string;
  download_count: number;
  like_count: number;
}

const AdminPanel = () => {
  const [currentCreatorCode, setCurrentCreatorCode] = useState<string | null>(null);
  const [creatorCode, setCreatorCode] = useState<string>("");
  const [selectedWallpapers, setSelectedWallpapers] = useState<string[]>([]);
  
  const { data: wallpapers = [] } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('wallpapers')
        .select('id, url, type, file_path, download_count, like_count')
        .eq('uploaded_by', session.user.id);

      if (error) throw error;
      return data || [];
    }
  });

  const handleUpdateCreatorCode = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('users')
        .update({ creator_code: creatorCode })
        .eq('id', session.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Creator code updated successfully",
      });
      setCurrentCreatorCode(creatorCode);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMultiple = async () => {
    try {
      const { error } = await supabase
        .from('wallpapers')
        .delete()
        .in('id', selectedWallpapers);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Selected wallpapers deleted successfully",
      });
      setSelectedWallpapers([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteWallpaper = async (wallpaper: Wallpaper) => {
    try {
      const { error } = await supabase
        .from('wallpapers')
        .delete()
        .eq('id', wallpaper.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Wallpaper deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
        <Tabs defaultValue="creator-code" className="w-full">
          <TabsList className="w-full flex flex-wrap gap-2 mb-4">
            <TabsTrigger value="creator-code" className="flex-1">Creator Code</TabsTrigger>
            <TabsTrigger value="wallpapers" className="flex-1">Wallpapers</TabsTrigger>
            <TabsTrigger value="collections" className="flex-1">Collections</TabsTrigger>
          </TabsList>

          <TabsContent value="creator-code">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Creator Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm">
                    Current Creator Code: {currentCreatorCode || "Not set"}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                      placeholder="Enter new creator code"
                      value={creatorCode}
                      onChange={(e) => setCreatorCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleUpdateCreatorCode} className="w-full sm:w-auto">
                      Update Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallpapers">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              {selectedWallpapers.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <Trash className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedWallpapers.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Multiple Wallpapers</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedWallpapers.length} wallpapers? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteMultiple}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallpapers.map((wallpaper) => (
                <Card 
                  key={wallpaper.id} 
                  className={`relative ${selectedWallpapers.includes(wallpaper.id) ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedWallpapers.includes(wallpaper.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedWallpapers([...selectedWallpapers, wallpaper.id]);
                        } else {
                          setSelectedWallpapers(selectedWallpapers.filter(id => id !== wallpaper.id));
                        }
                      }}
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {wallpaper.type} Wallpaper
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <img
                      src={wallpaper.url}
                      alt="Wallpaper"
                      className="w-full aspect-[3/4] object-cover rounded-md"
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>{wallpaper.download_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        <span>{wallpaper.like_count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteWallpaper(wallpaper)}
                      className="w-full sm:w-auto"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="collections">
            <CollectionManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
