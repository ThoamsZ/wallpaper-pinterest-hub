import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { deleteWallpaper } from "@/utils/wallpaper-utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Heart, Trash, Upload, Grid, Plus, LayoutGrid, Link } from "lucide-react";
import Header from "@/components/Header";
import DashboardStats from "@/components/admin/DashboardStats";
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedWallpapers, setSelectedWallpapers] = useState<string[]>([]);
  const [creatorCode, setCreatorCode] = useState<string>("");
  const [currentCreatorCode, setCurrentCreatorCode] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [viewingCreator, setViewingCreator] = useState<any>(null);
  const [hasFullAccess, setHasFullAccess] = useState(false);

  useEffect(() => {
    const storedCreator = localStorage.getItem('viewing_creator');
    const stateCreator = location.state?.viewingCreator;
    
    if (storedCreator) {
      try {
        const creatorInfo = JSON.parse(storedCreator);
        setViewingCreator(creatorInfo);
        setHasFullAccess(creatorInfo.fullAccess || location.state?.fullAccess || false);
      } catch (error) {
        console.error('Error parsing creator info:', error);
        localStorage.removeItem('viewing_creator');
      }
    } else if (stateCreator) {
      const creatorInfo = typeof stateCreator === 'object' ? stateCreator : { id: stateCreator };
      setViewingCreator(creatorInfo);
      setHasFullAccess(location.state?.fullAccess || false);
      localStorage.setItem('viewing_creator', JSON.stringify({
        ...creatorInfo,
        fullAccess: location.state?.fullAccess || false
      }));
    }
  }, [location]);

  const exitCreatorView = () => {
    localStorage.removeItem('viewing_creator');
    setViewingCreator(null);
    setHasFullAccess(false);
    navigate('/admin-manager');
    
    toast({
      title: "Exited Creator View",
      description: "You've returned to the admin manager",
    });
  };

  const { data: adminData, isError: isAdminError } = useQuery({
    queryKey: ['admin-status', viewingCreator?.id],
    queryFn: async () => {
      const userId = viewingCreator?.id;
      
      if (userId) {
        // Check if viewing user is an admin
        const { data: adminUserData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        // Check if viewing user is a creator
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .not('is_blocked', 'eq', true)
          .maybeSingle();

        if (adminUserData) {
          return {
            admin_type: 'admin',
            creator_code: null,
            email: adminUserData.email,
            isCreatorView: true
          };
        } else if (creatorData) {
          return {
            admin_type: 'creator',
            creator_code: creatorData.creator_code,
            email: creatorData.email,
            isCreatorView: true
          };
        } else {
          throw new Error("Not an admin or creator");
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Check if current user is an admin
        const { data: adminUserData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        // Check if current user is a creator
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .not('is_blocked', 'eq', true)
          .maybeSingle();

        if (adminUserData) {
          return {
            admin_type: 'admin',
            creator_code: null,
            email: adminUserData.email
          };
        } else if (creatorData) {
          return {
            admin_type: 'creator',
            creator_code: creatorData.creator_code,
            email: creatorData.email
          };
        } else {
          throw new Error("Not an admin or creator");
        }
      }
    },
    retry: false
  });

  const { data: wallpapers = [], refetch: refetchWallpapers } = useQuery({
    queryKey: ['admin-wallpapers', viewingCreator?.id],
    queryFn: async () => {
      const userId = viewingCreator?.id;
      
      if (userId) {
        const { data, error } = await supabase
          .from('wallpapers')
          .select('*')
          .eq('uploaded_by', userId);

        if (error) throw error;
        return data || [];
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from('wallpapers')
          .select('*')
          .eq('uploaded_by', session.user.id);

        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!adminData
  });

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
        .from('creators')
        .update({ creator_code: creatorCode.trim() })
        .eq('user_id', session.user.id);

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
      setIsDeleting(true);
      setDeleteItemId(id);
      
      console.log(`Starting deletion of wallpaper ${id} with filePath ${filePath}`);
      console.log(`Has full access: ${hasFullAccess}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !viewingCreator) throw new Error("Not authenticated");
      
      const { data: wallpaperCheck, error: checkError } = await supabase
        .from('wallpapers')
        .select('id')
        .eq('id', id)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking wallpaper existence:", checkError);
        throw checkError;
      }
      
      if (!wallpaperCheck) {
        toast({
          title: "Notice",
          description: "Wallpaper already deleted or doesn't exist",
        });
        return;
      }

      const success = await deleteWallpaper(id, filePath, hasFullAccess);
      
      if (success) {
        toast({
          title: "Success",
          description: "Wallpaper deleted successfully",
        });
        
        await refetchWallpapers();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete wallpaper",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete wallpaper",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteItemId(null);
    }
  };

  const handleDeleteMultiple = async () => {
    try {
      setIsDeleting(true);
      
      console.log("Starting deletion of multiple wallpapers:", selectedWallpapers);
      console.log(`Has full access: ${hasFullAccess}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: wallpapersToDelete, error: fetchError } = await supabase
        .from('wallpapers')
        .select('id, file_path')
        .in('id', selectedWallpapers);

      if (fetchError) {
        console.error("Error fetching wallpapers to delete:", fetchError);
        throw fetchError;
      }

      if (!wallpapersToDelete || wallpapersToDelete.length === 0) {
        toast({
          title: "Notice",
          description: "No wallpapers found to delete",
        });
        return;
      }

      console.log(`Found ${wallpapersToDelete.length} wallpapers to delete`);

      let successCount = 0;
      for (const wallpaper of wallpapersToDelete) {
        try {
          const deleted = await deleteWallpaper(wallpaper.id, wallpaper.file_path, hasFullAccess);
          if (deleted) successCount++;
        } catch (error) {
          console.error(`Error deleting wallpaper ${wallpaper.id}:`, error);
        }
      }

      console.log(`Successfully deleted ${successCount} of ${wallpapersToDelete.length} wallpapers`);
      
      toast({
        title: "Success",
        description: `${successCount} wallpapers deleted successfully`,
      });
      
      setSelectedWallpapers([]);
      await refetchWallpapers();
    } catch (error: any) {
      console.error("Delete multiple error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete wallpapers",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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

  const copyLinkToClipboard = (id: string) => {
    const wallpaperUrl = `${window.location.origin}/wallpaper/${id}`;
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

  useEffect(() => {
    if (adminData) {
      setCurrentCreatorCode(adminData.creator_code || "");
    }
  }, [adminData]);

  if (!adminData) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-full">
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader className="flex flex-col items-center justify-center py-4">
            <h2 className="text-lg font-semibold text-center">Creator Dashboard</h2>
            <p className="text-sm text-muted-foreground">{adminData.email}</p>
            {viewingCreator && (
              <div className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                Viewing Creator Account
              </div>
            )}
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={true} tooltip="Dashboard">
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Upload Wallpapers" onClick={() => navigate("/upload")}>
                      <Upload className="w-4 h-4 mr-2" />
                      <span>Upload Wallpapers</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="p-4">
              {viewingCreator ? (
                <Button 
                  onClick={exitCreatorView}
                  variant="destructive"
                  className="w-full"
                >
                  Exit Creator View
                </Button>
              ) : (
                <div className="text-xs text-center text-muted-foreground">
                  <p>© 2023 Creator Portal</p>
                </div>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 bg-background min-h-screen">
          {viewingCreator && (
            <div className={`${hasFullAccess ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border-b py-2 px-4`}>
              <div className="container mx-auto flex justify-between items-center">
                <p className={hasFullAccess ? 'text-red-800' : 'text-yellow-800'}>
                  <strong>Creator View Mode:</strong> You are viewing {viewingCreator.email || "this creator"}'s dashboard
                  {hasFullAccess && <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-semibold">Full Access Mode</span>}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exitCreatorView}
                  className={hasFullAccess ? 'text-red-800 border-red-300 hover:bg-red-100' : 'text-yellow-800 border-yellow-300 hover:bg-yellow-100'}
                >
                  Exit
                </Button>
              </div>
            </div>
          )}
          
          <Header />
          <div className="container mx-auto px-4 py-8 mt-20">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold">Creator Dashboard {hasFullAccess && viewingCreator && <span className="text-sm font-normal text-red-600">(Full Access Mode)</span>}</h1>
                <p className="text-gray-600">Manage your wallpapers and collections</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate("/")}>
                  View Site
                </Button>
                <Button onClick={() => navigate("/upload")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Wallpapers
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Total Wallpapers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{wallpapers.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Total Downloads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {wallpapers.reduce((sum, w) => sum + (w.download_count || 0), 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Total Likes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {wallpapers.reduce((sum, w) => sum + (w.like_count || 0), 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Creator Code Management</CardTitle>
                <CardDescription>Set or update your creator referral code</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentCreatorCode && (
                    <p className="text-sm">
                      Current Creator Code: <span className="font-semibold bg-secondary px-2 py-1 rounded-md">{currentCreatorCode}</span>
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

            <Tabs defaultValue="wallpapers" className="space-y-6">
              <TabsList className="mb-4">
                <TabsTrigger value="wallpapers">Wallpapers</TabsTrigger>
                <TabsTrigger value="collections">Collections</TabsTrigger>
              </TabsList>

              <TabsContent value="wallpapers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {viewingCreator ? `${viewingCreator.email}'s Wallpapers` : 'Your Wallpapers'}
                      {hasFullAccess && <span className="ml-2 text-sm font-normal text-red-600">(Full Access Mode)</span>}
                    </CardTitle>
                    <CardDescription>
                      {hasFullAccess 
                        ? "You have full access to manage these wallpapers including deletion" 
                        : "Manage your uploaded wallpapers"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      {selectedWallpapers.length > 0 && hasFullAccess && (
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
                        <Card key={wallpaper.id} className={`relative overflow-hidden hover:shadow-md transition-shadow ${selectedWallpapers.includes(wallpaper.id) ? 'ring-2 ring-primary' : ''}`}>
                          <div className="absolute top-2 left-2 z-10">
                            {hasFullAccess && (
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
                            )}
                          </div>
                          <div className="relative h-48">
                            <img
                              src={wallpaper.url}
                              alt="Wallpaper"
                              className="w-full h-full object-cover"
                            />
                            <Button 
                              variant="secondary"
                              size="icon"
                              className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
                              onClick={() => copyLinkToClipboard(wallpaper.id)}
                            >
                              <Link className="h-4 w-4 text-white" />
                            </Button>
                          </div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{wallpaper.type} Wallpaper</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 pb-2">
                            <div className="flex flex-wrap gap-1">
                              {wallpaper.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <Input
                              defaultValue={wallpaper.tags.join(', ')}
                              placeholder="Update tags (comma-separated)"
                              onBlur={(e) => handleUpdateTags(wallpaper.id, e.target.value)}
                              className="text-xs"
                            />
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Download className="w-3 h-3" />
                                <span>{wallpaper.download_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                <span>{wallpaper.like_count || 0}</span>
                              </div>
                            </div>
                          </CardContent>
                          {hasFullAccess && (
                            <CardFooter className="pt-0">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                onClick={() => handleDelete(wallpaper.id, wallpaper.file_path)}
                              >
                                <Trash className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </CardFooter>
                          )}
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="collections">
                <Card>
                  <CardHeader>
                    <CardTitle>{viewingCreator ? `${viewingCreator.email}'s Collections` : 'Your Collections'}</CardTitle>
                    <CardDescription>Manage your wallpaper collections</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CollectionManager />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPanel;
