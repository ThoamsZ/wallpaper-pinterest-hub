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
import { Download, Heart, Trash, Upload, Grid, Plus, LayoutGrid, Link, User, Code, Settings } from "lucide-react";
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
          .eq('uploaded_by', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from('wallpapers')
          .select('*')
          .eq('uploaded_by', session.user.id)
          .order('created_at', { ascending: false });

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

      let successCount = 0;
      for (const wallpaper of wallpapersToDelete) {
        try {
          const deleted = await deleteWallpaper(wallpaper.id, wallpaper.file_path, hasFullAccess);
          if (deleted) successCount++;
        } catch (error) {
          console.error(`Error deleting wallpaper ${wallpaper.id}:`, error);
        }
      }
      
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

  const copyCreatorProfileLink = () => {
    if (currentCreatorCode) {
      const profileUrl = `${window.location.origin}/creator/${currentCreatorCode}`;
      navigator.clipboard.writeText(profileUrl)
        .then(() => {
          toast({
            title: "Profile link copied",
            description: "Creator profile link copied to clipboard",
          });
        })
        .catch(() => {
          toast({
            title: "Copy failed",
            description: "Could not copy the profile link to clipboard",
            variant: "destructive",
          });
        });
    }
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
      <div className="flex h-full min-h-screen">
        <Sidebar variant="inset" collapsible="icon" className="border-r">
          <SidebarHeader className="flex flex-col items-center justify-center py-6 border-b">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">Creator Dashboard</h2>
              <p className="text-sm text-muted-foreground">{adminData.email}</p>
              {viewingCreator && (
                <div className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-md">
                  Admin View Mode
                </div>
              )}
              {hasFullAccess && (
                <div className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-md">
                  Full Access Mode
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={true}>
                      <LayoutGrid className="w-4 h-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/upload")}>
                      <Upload className="w-4 h-4" />
                      <span>Upload</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Grid className="w-4 h-4" />
                      <span>Wallpapers ({wallpapers.length})</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Plus className="w-4 h-4" />
                      <span>Collections</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {currentCreatorCode && (
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={copyCreatorProfileLink}>
                        <User className="w-4 h-4" />
                        <span>My Profile</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t">
            <div className="p-4 space-y-2">
              {viewingCreator ? (
                <Button 
                  onClick={exitCreatorView}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  Exit Creator View
                </Button>
              ) : (
                <div className="text-xs text-center text-muted-foreground">
                  <p>Creator Dashboard v1.0</p>
                </div>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 bg-background">
          <div className="sticky top-0 z-40 bg-background border-b px-4 py-2">
            <SidebarTrigger />
          </div>

          <main className="p-6 space-y-6">
            {/* Stats Overview */}
            <DashboardStats />

            {/* Creator Code Management */}
            {adminData.admin_type === 'creator' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Creator Code Management
                  </CardTitle>
                  <CardDescription>
                    Set your unique creator code for users to find your profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentCreatorCode ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label>Current Code:</Label>
                        <Badge variant="secondary" className="font-mono">
                          {currentCreatorCode}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyCreatorProfileLink}
                        >
                          <Link className="w-4 h-4 mr-1" />
                          Copy Profile Link
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Profile URL: {window.location.origin}/creator/{currentCreatorCode}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No creator code set. Create one to allow users to find your profile.
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter new creator code"
                      value={creatorCode}
                      onChange={(e) => setCreatorCode(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button onClick={handleUpdateCreatorCode}>
                      {currentCreatorCode ? "Update Code" : "Set Code"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="wallpapers" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wallpapers" className="flex items-center gap-2">
                  <Grid className="w-4 h-4" />
                  Wallpapers ({wallpapers.length})
                </TabsTrigger>
                <TabsTrigger value="collections" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Collections
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wallpapers" className="space-y-4">
                {/* Bulk Actions */}
                {selectedWallpapers.length > 0 && hasFullAccess && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {selectedWallpapers.length} wallpaper(s) selected
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash className="w-4 h-4 mr-2" />
                              Delete Selected
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Wallpapers</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {selectedWallpapers.length} wallpaper(s)? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleDeleteMultiple}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Wallpapers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {wallpapers.map((wallpaper) => (
                    <Card key={wallpaper.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <img
                          src={wallpaper.url}
                          alt={`Wallpaper ${wallpaper.id}`}
                          className="w-full h-full object-cover"
                        />
                        {hasFullAccess && (
                          <div className="absolute top-2 left-2">
                            <Checkbox
                              checked={selectedWallpapers.includes(wallpaper.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedWallpapers(prev => [...prev, wallpaper.id]);
                                } else {
                                  setSelectedWallpapers(prev => prev.filter(id => id !== wallpaper.id));
                                }
                              }}
                              className="bg-background"
                            />
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            <span>{wallpaper.download_count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4" />
                            <span>{wallpaper.like_count}</span>
                          </div>
                        </div>

                        {wallpaper.tags && wallpaper.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {wallpaper.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {wallpaper.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{wallpaper.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="p-4 pt-0 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyLinkToClipboard(wallpaper.id)}
                          className="flex-1"
                        >
                          <Link className="w-4 h-4" />
                        </Button>
                        
                        {hasFullAccess && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm"
                                variant="destructive"
                                disabled={isDeleting && deleteItemId === wallpaper.id}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Wallpaper</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this wallpaper? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(wallpaper.id, wallpaper.file_path)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                {wallpapers.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Grid className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No wallpapers uploaded</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start by uploading your first wallpaper
                      </p>
                      <Button onClick={() => navigate("/upload")}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Wallpaper
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="collections">
                <CollectionManager />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPanel;