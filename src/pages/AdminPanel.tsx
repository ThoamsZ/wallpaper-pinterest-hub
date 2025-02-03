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
import { Download, Heart, Trash } from "lucide-react";
import Header from "@/components/Header";
import { CollectionManager } from "@/components/admin/CollectionManager";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

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
  const [adminEmail, setAdminEmail] = useState<string>("");

  const { data: wallpapers = [], refetch: refetchWallpapers } = useQuery({
    queryKey: ['admin-wallpapers'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (!userData?.is_admin) {
        navigate("/");
        throw new Error("Not authorized");
      }

      const { data, error } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', session.user.id);

      if (error) throw error;
      return data || [];
    }
  });

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
      .single();

    if (!userData?.is_admin) {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      return;
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // First, delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('wallpapers')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        throw storageError;
      }

      // Then, delete the record from the database
      const { error: dbError } = await supabase
        .from('wallpapers')
        .delete()
        .eq('id', id)
        .eq('uploaded_by', session.user.id); // Only delete if the user owns the wallpaper

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      }

      refetchWallpapers();
      
      toast({
        title: "Success",
        description: "Wallpaper deleted successfully",
      });
    } catch (error: any) {
      console.error('Delete operation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete wallpaper",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTags = async (id: string, newTags: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const tagArray = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const { error } = await supabase
        .from('wallpapers')
        .update({ tags: tagArray })
        .eq('id', id)
        .eq('uploaded_by', session.user.id); // Only update if the user owns the wallpaper

      if (error) throw error;

      refetchWallpapers();

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

        <Tabs defaultValue="wallpapers">
          <TabsList className="mb-8">
            <TabsTrigger value="wallpapers">Wallpapers</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>

          <TabsContent value="wallpapers">
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
          </TabsContent>

          <TabsContent value="collections">
            <CollectionManager />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AdminPanel;