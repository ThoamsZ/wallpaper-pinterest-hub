import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Heart, Trash, X } from "lucide-react";
import Header from "@/components/Header";

interface Wallpaper {
  id: string;
  url: string;
  type: string;
  tags: string[];
  file_path: string;
  download_count: number;
  like_count: number;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/");
      return;
    }

    setAdminEmail(session.user.email || "");

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!userData?.is_admin) {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      return;
    }

    loadWallpapers(session.user.id);
  };

  const loadWallpapers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', userId);

      if (error) throw error;
      setWallpapers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load wallpapers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('wallpapers')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('wallpapers')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Update local state
      setWallpapers(wallpapers.filter(w => w.id !== id));
      
      toast({
        title: "Success",
        description: "Wallpaper deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete wallpaper",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTags = async (id: string, newTags: string) => {
    try {
      const tagArray = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const { error } = await supabase
        .from('wallpapers')
        .update({ tags: tagArray })
        .eq('id', id);

      if (error) throw error;

      setWallpapers(wallpapers.map(w => 
        w.id === id ? { ...w, tags: tagArray } : w
      ));

      toast({
        title: "Success",
        description: "Tags updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update tags",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-gray-600">Logged in as: {adminEmail}</p>
          </div>
          <div className="space-x-4">
            <Button onClick={() => navigate("/upload")}>Upload Wallpapers</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallpapers.map((wallpaper) => (
            <Card key={wallpaper.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {wallpaper.type} Wallpaper
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <img
                  src={wallpaper.url}
                  alt="Wallpaper"
                  className="w-full h-48 object-cover rounded-md"
                />
                <div className="flex flex-wrap gap-2">
                  {wallpaper.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Input
                  defaultValue={wallpaper.tags.join(', ')}
                  placeholder="Update tags (comma-separated)"
                  onBlur={(e) => handleUpdateTags(wallpaper.id, e.target.value)}
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
              <CardFooter className="justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(wallpaper.id, wallpaper.file_path)}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

export default AdminPanel;