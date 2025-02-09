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
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  tags: string[];
  file_path: string;
  download_count: number;
  like_count: number;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedWallpapers, setSelectedWallpapers] = useState<string[]>([]);
  const [creatorCode, setCreatorCode] = useState<string>("");
  const [currentCreatorCode, setCurrentCreatorCode] = useState<string>("");

  // Check admin status
  const { data: adminData, isError: isAdminError } = useQuery({
    queryKey: ['admin-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // First check if user is an admin
      const { data: adminUserData, error: adminError } = await supabase
        .from('admin_users')
        .select('admin_type')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (adminError) throw adminError;
      if (!adminUserData) {
        throw new Error("Not an admin");
      }

      // Then get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('creator_code, email')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;
      
      return {
        admin_type: adminUserData.admin_type,
        creator_code: userData?.creator_code,
        email: userData?.email
      };
    },
    retry: false
  });

  // Handle admin check error
  useEffect(() => {
    if (isAdminError) {
      toast({
        title: "Access Denied",
        description: "Please log in with an admin account",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [isAdminError, navigate]);

  const handleUpdateCreatorCode = async () => {
    try {
      if (!creatorCode.trim()) {
        toast({
          title: "Error",
          description: "Creator code cannot be empty",
          variant: "destructive",
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('users')
        .update({ creator_code: creatorCode.trim() })
        .eq('id', session.user.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error("This creator code is already taken");
        }
        throw error;
      }

      setCurrentCreatorCode(creatorCode.trim());
      setCreatorCode("");
      queryClient.invalidateQueries({ queryKey: ['admin-status'] });
      
      toast({
        title: "Success",
        description: "Creator code updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update creator code",
        variant: "destructive",
      });
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

      if (storageError) throw storageError;

      // Then, delete the record from the database
      const { error: dbError } = await supabase
        .from('wallpapers')
        .delete()
        .eq('id', id)
        .eq('uploaded_by', session.user.id);

      if (dbError) throw dbError;

      const { error: collectionError } = await supabase
        .from('collection_wallpapers')
        .delete()
        .eq('wallpaper_id', id);

      if (collectionError) throw collectionError;

      await refetchWallpapers();
      
      toast({
        title: "Success",
        description: "Wallpaper deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete wallpaper",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMultiple = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const wallpapersToDelete = wallpapers.filter(w => selectedWallpapers.includes(w.id));

      // First delete from storage
      for (const wallpaper of wallpapersToDelete) {
        const { error: storageError } = await supabase.storage
          .from('wallpapers')
          .remove([wallpaper.file_path]);

        if (storageError) throw storageError;
      }

      // Then delete from database
      const { error: dbError } = await supabase
        .from('wallpapers')
        .delete()
        .in('id', selectedWallpapers)
        .eq('uploaded_by', session.user.id);

      if (dbError) throw dbError;

      // Also delete from collection_wallpapers
      const { error: collectionError } = await supabase
        .from('collection_wallpapers')
        .delete()
        .in('wallpaper_id', selectedWallpapers);

      if (collectionError) throw collectionError;

      toast({
        title: "Success",
        description: `${selectedWallpapers.length} wallpapers deleted successfully`,
      });
      
      setSelectedWallpapers([]);
      await refetchWallpapers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete wallpapers",
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
        .eq('uploaded_by', session.user.id);

      if (error) throw error;

      await refetchWallpapers();

      toast({
        title: "Success",
        description: "Tags updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update tags",
        variant: "destructive",
      });
    }
  };

  // Fetch wallpapers
  const { data: wallpapers = [], refetch: refetchWallpapers } = useQuery({
    queryKey: ['admin-wallpapers'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', session.user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!adminData
  });

  useEffect(() => {
    if (adminData) {
      setCurrentCreatorCode(adminData.creator_code || "");
    }
  }, [adminData]);

  // If not admin or loading, show nothing
  if (!adminData) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-gray-600">Logged in as: {adminData.email}</p>
          </div>
          <div className="space-x-4">
            <Button onClick={() => navigate("/upload")}>Upload Wallpapers</Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Creator Code Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentCreatorCode && (
                <p className="text-sm text-gray-600">
                  Current Creator Code: <span className="font-semibold">{currentCreatorCode}</span>
                </p>
              )}
              <div className="flex gap-4">
                <Input
                  placeholder="Enter new creator code"
                  value={creatorCode}
                  onChange={(e) => setCreatorCode(e.target.value)}
                />
                <Button onClick={handleUpdateCreatorCode}>
                  {currentCreatorCode ? "Update" : "Set"} Creator Code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="wallpapers">
          <TabsList className="mb-8">
            <TabsTrigger value="wallpapers">Wallpapers</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>

          <TabsContent value="wallpapers">
            <div className="flex justify-between items-center mb-4">
              {selectedWallpapers.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedWallpapers.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Multiple Wallpapers</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedWallpapers.length} wallpapers? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteMultiple}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wallpapers.map((wallpaper) => (
                <Card key={wallpaper.id} className={`relative ${selectedWallpapers.includes(wallpaper.id) ? 'ring-2 ring-primary' : ''}`}>
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
