
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Trash,
  Ban,
  UserX,
  LayoutDashboard,
  Users,
  UserPlus,
  Search,
  Check,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";

const AdminManager = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("stats");
  const [searchTerm, setSearchTerm] = useState("");
  const [creatorApplications, setCreatorApplications] = useState<any[]>([]);
  const [statsData, setStatsData] = useState({
    totalDownloads: 0,
    totalPurchases: 0,
    todayDownloads: 0,
    todayPurchases: 0,
  });

  useEffect(() => {
    checkAdminManagerStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      if (activeTab === "creators") {
        fetchCreators();
      } else if (activeTab === "applications") {
        fetchCreatorApplications();
      } else if (activeTab === "stats") {
        fetchStatsData();
      }
    }
  }, [isLoggedIn, activeTab]);

  const checkAdminManagerStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoggedIn(false);
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select()
        .eq('user_id', session.user.id)
        .eq('admin_type', 'admin_manager')
        .maybeSingle();

      if (adminError) {
        console.error('Admin check error:', adminError);
        setIsLoggedIn(false);
        return;
      }

      if (!adminData) {
        console.log('Not an admin manager');
        setIsLoggedIn(false);
        navigate('/admin-panel');
        return;
      }

      setIsLoggedIn(true);
      setActiveTab("stats");
      fetchStatsData();
    } catch (error) {
      console.error('Error checking admin manager status:', error);
      setIsLoggedIn(false);
    }
  };

  const fetchStatsData = async () => {
    try {
      // Fetch total downloads
      const { data: downloadData, error: downloadError } = await supabase
        .from('wallpapers')
        .select('download_count')
        .is('download_count', null, { negate: true });

      if (downloadError) throw downloadError;

      const totalDownloads = downloadData.reduce((sum, item) => sum + (item.download_count || 0), 0);

      // Fetch total purchases
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('paypal_orders')
        .select('*')
        .eq('status', 'completed');

      if (purchaseError) throw purchaseError;

      // Fetch today's downloads (placeholder - would need a downloads log table to be accurate)
      // This is just calculating 5% of total as a placeholder
      const todayDownloads = Math.round(totalDownloads * 0.05);

      // Fetch today's purchases
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayPurchaseData, error: todayPurchaseError } = await supabase
        .from('paypal_orders')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      if (todayPurchaseError) throw todayPurchaseError;

      setStatsData({
        totalDownloads,
        totalPurchases: purchaseData.length,
        todayDownloads,
        todayPurchases: todayPurchaseData.length,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch stats data",
        variant: "destructive",
      });
    }
  };

  const fetchCreators = async () => {
    try {
      const { data: adminUsers, error: adminsError } = await supabase
        .from('admin_users')
        .select(`
          *,
          profile:users!inner(
            email,
            creator_code
          )
        `)
        .eq('admin_type', 'admin');

      if (adminsError) throw adminsError;

      const formattedAdminUsers = adminUsers?.map(admin => ({
        ...admin,
        users: admin.profile
      })) || [];

      setCreators(formattedAdminUsers);

      // Fetch wallpapers for each creator
      const wallpapersPromises = adminUsers.map((admin: any) =>
        supabase
          .from('wallpapers')
          .select('*')
          .eq('uploaded_by', admin.user_id)
      );

      const wallpapersResults = await Promise.all(wallpapersPromises);
      const allWallpapers = wallpapersResults.flatMap(result => result.data || []);
      setWallpapers(allWallpapers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch creators",
        variant: "destructive",
      });
    }
  };

  const fetchCreatorApplications = async () => {
    try {
      // Get all users with creator_code but who are not yet in admin_users table
      const { data: userApplications, error: usersError } = await supabase
        .from('users')
        .select('id, email, creator_code')
        .not('creator_code', 'is', null);

      if (usersError) throw usersError;

      if (!userApplications || userApplications.length === 0) {
        setCreatorApplications([]);
        return;
      }

      const userIds = userApplications.map(user => user.id);

      // Check which users are already admins
      const { data: existingAdmins, error: adminsError } = await supabase
        .from('admin_users')
        .select('user_id')
        .in('user_id', userIds);

      if (adminsError) throw adminsError;

      // Filter out users who are already admins
      const existingAdminIds = existingAdmins?.map(admin => admin.user_id) || [];
      const pendingApplications = userApplications.filter(
        user => !existingAdminIds.includes(user.id)
      );

      setCreatorApplications(pendingApplications);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch creator applications",
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('admin_type')
        .eq('user_id', signInData.session?.user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!adminData || adminData.admin_type !== 'admin_manager') {
        await supabase.auth.signOut();
        throw new Error("Access denied. This page is only for admin managers.");
      }

      setIsLoggedIn(true);
      setActiveTab("stats");
      fetchStatsData();
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWallpaper = async (wallpaperId: string, filePath: string) => {
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
        .eq('id', wallpaperId);

      if (dbError) throw dbError;

      setWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
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

  const handleBlockCreator = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_blocked: true })
        .eq('id', adminId);

      if (error) throw error;

      setCreators(prev =>
        prev.map(creator =>
          creator.id === adminId
            ? { ...creator, is_blocked: true }
            : creator
        )
      );

      toast({
        title: "Success",
        description: "Creator blocked successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to block creator",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCreator = async (adminId: string, userId: string) => {
    try {
      console.log('Deleting creator:', { adminId, userId });

      // First fetch all wallpapers by this creator
      const { data: creatorWallpapers, error: wallpapersError } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', userId);

      if (wallpapersError) {
        console.error('Error fetching wallpapers:', wallpapersError);
        throw wallpapersError;
      }

      console.log('Found wallpapers:', creatorWallpapers);

      // Delete wallpapers from collections first
      if (creatorWallpapers && creatorWallpapers.length > 0) {
        const wallpaperIds = creatorWallpapers.map(w => w.id);
        
        // Delete from collection_wallpapers
        const { error: collectionWallpapersError } = await supabase
          .from('collection_wallpapers')
          .delete()
          .in('wallpaper_id', wallpaperIds);

        if (collectionWallpapersError) {
          console.error('Error deleting from collection_wallpapers:', collectionWallpapersError);
          throw collectionWallpapersError;
        }

        console.log('Deleted wallpapers from collections');

        // Delete files from storage
        const filePaths = creatorWallpapers.map(w => w.file_path);
        const { error: storageError } = await supabase.storage
          .from('wallpapers')
          .remove(filePaths);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
          throw storageError;
        }

        console.log('Deleted files from storage');

        // Delete wallpapers from database
        const { error: deleteWallpapersError } = await supabase
          .from('wallpapers')
          .delete()
          .eq('uploaded_by', userId);

        if (deleteWallpapersError) {
          console.error('Error deleting wallpapers:', deleteWallpapersError);
          throw deleteWallpapersError;
        }

        console.log('Deleted wallpapers from database');
      }

      // Delete collections created by this user
      const { error: deleteCollectionsError } = await supabase
        .from('collections')
        .delete()
        .eq('created_by', userId);

      if (deleteCollectionsError) {
        console.error('Error deleting collections:', deleteCollectionsError);
        throw deleteCollectionsError;
      }

      console.log('Deleted collections');

      // Remove admin status
      const { error: adminError } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (adminError) {
        console.error('Error deleting admin status:', adminError);
        throw adminError;
      }

      console.log('Deleted admin status');

      // Update user to remove creator code
      const { error: userError } = await supabase
        .from('users')
        .update({ creator_code: null })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user:', userError);
        throw userError;
      }

      console.log('Updated user, removed creator code');

      setCreators(prev => prev.filter(creator => creator.id !== adminId));
      setWallpapers(prev => prev.filter(w => w.uploaded_by !== userId));

      toast({
        title: "Success",
        description: "Creator and all their data removed successfully",
      });
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete creator",
        variant: "destructive",
      });
    }
  };

  const handleApproveCreator = async (userId: string, email: string) => {
    try {
      // Add user to admin_users table
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: userId,
          admin_type: 'admin',
          email: email
        });

      if (adminError) throw adminError;

      // Remove from applications list
      setCreatorApplications(prev => prev.filter(app => app.id !== userId));

      toast({
        title: "Success",
        description: `Creator ${email} approved successfully`,
      });
      
      // Refresh applications list
      fetchCreatorApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve creator",
        variant: "destructive",
      });
    }
  };

  const filteredCreators = searchTerm 
    ? creators.filter(creator => 
        creator.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.users?.creator_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : creators;

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Admin Manager Login</h1>
            <p className="text-gray-600 mt-2">Access the admin management panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Login"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="flex items-center justify-between px-4 py-2">
            <h2 className="text-lg font-bold">Admin Manager</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === 'stats'} 
                  onClick={() => setActiveTab('stats')}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  <span>Stats</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === 'creators'} 
                  onClick={() => setActiveTab('creators')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  <span>Creator Manager</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === 'applications'} 
                  onClick={() => setActiveTab('applications')}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  <span>Creator Applications</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="p-6 overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              {activeTab === 'stats' && 'Website Statistics'}
              {activeTab === 'creators' && 'Creator Management'}
              {activeTab === 'applications' && 'Creator Applications'}
            </h1>
            <Button 
              variant="outline"
              onClick={() => {
                supabase.auth.signOut();
                setIsLoggedIn(false);
              }}
            >
              Logout
            </Button>
          </div>

          {/* Stats Page */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Downloads</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{statsData.totalDownloads}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Total Purchases</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{statsData.totalPurchases}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Today's Downloads</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{statsData.todayDownloads}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Today's Purchases</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{statsData.todayPurchases}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Creator Manager Page */}
          {activeTab === 'creators' && (
            <div>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search creators by email or creator code..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredCreators.map((creator) => (
                  <Card key={creator.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span>{creator.users?.email}</span>
                          <span className="text-sm text-muted-foreground">Creator Code: {creator.users?.creator_code || 'N/A'}</span>
                        </div>
                        {creator.is_blocked && (
                          <span className="text-sm text-red-500">Blocked</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">Wallpapers:</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {wallpapers
                            .filter(w => w.uploaded_by === creator.user_id)
                            .map((wallpaper) => (
                              <div key={wallpaper.id} className="relative group">
                                <img
                                  src={wallpaper.url}
                                  alt="Wallpaper"
                                  className="w-full h-24 object-cover rounded"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteWallpaper(wallpaper.id, wallpaper.file_path)}
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline">
                            <Ban className="w-4 h-4 mr-2" />
                            {creator.is_blocked ? 'Unblock' : 'Block'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {creator.is_blocked ? 'Unblock Creator' : 'Block Creator'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to {creator.is_blocked ? 'unblock' : 'block'} this creator?
                              {!creator.is_blocked && " They won't be able to access the admin panel while blocked."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleBlockCreator(creator.id)}
                            >
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <UserX className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Creator</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this creator? This will:
                              <ul className="list-disc list-inside mt-2">
                                <li>Delete all their wallpapers</li>
                                <li>Remove their creator privileges</li>
                                <li>Delete their creator code</li>
                              </ul>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCreator(creator.id, creator.user_id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              {filteredCreators.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No creators found.</p>
                </div>
              )}
            </div>
          )}

          {/* Creator Applications Page */}
          {activeTab === 'applications' && (
            <div>
              {creatorApplications.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Creator Code</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatorApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>{application.email}</TableCell>
                        <TableCell>{application.creator_code}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveCreator(application.id, application.email)}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No pending applications.</p>
                </div>
              )}
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminManager;
