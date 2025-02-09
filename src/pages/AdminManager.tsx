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
import { Trash, Ban, UserX } from "lucide-react";

const AdminManager = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);
  const [wallpapers, setWallpapers] = useState<any[]>([]);

  useEffect(() => {
    checkAdminManagerStatus();
  }, []);

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
      fetchCreators();
    } catch (error) {
      console.error('Error checking admin manager status:', error);
      setIsLoggedIn(false);
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
      fetchCreators();
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
      // Delete all wallpapers by this creator first
      const creatorWallpapers = wallpapers.filter(w => w.uploaded_by === userId);
      
      for (const wallpaper of creatorWallpapers) {
        await handleDeleteWallpaper(wallpaper.id, wallpaper.file_path);
      }

      // Remove admin status
      const { error: adminError } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (adminError) throw adminError;

      // Update user to remove creator code
      const { error: userError } = await supabase
        .from('users')
        .update({ creator_code: null })
        .eq('id', userId);

      if (userError) throw userError;

      setCreators(prev => prev.filter(creator => creator.id !== adminId));
      toast({
        title: "Success",
        description: "Creator removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete creator",
        variant: "destructive",
      });
    }
  };

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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin Manager Panel</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creators.map((creator) => (
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
    </div>
  );
};

export default AdminManager;
