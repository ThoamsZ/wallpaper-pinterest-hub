
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardStats from "@/components/admin/DashboardStats";
import CollectionManager from "@/components/admin/CollectionManager";
import CreatorsList from "@/components/admin/CreatorsList";
import CreatorApplications from "@/components/admin/CreatorApplications";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminType, setAdminType] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/admin");
        return;
      }
      
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('admin_type')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!adminUser) {
        navigate("/admin");
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin panel.",
          variant: "destructive",
        });
        return;
      }
      
      setIsAdmin(true);
      setAdminType(adminUser.admin_type);
    } catch (error) {
      console.error("Error checking admin status:", error);
      toast({
        title: "Error",
        description: "Failed to verify admin status.",
        variant: "destructive",
      });
      navigate("/admin");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/upload")} variant="outline">
            Upload Wallpapers
          </Button>
          <Button onClick={() => navigate("/wallpaper-control")} variant="outline">
            Wallpaper Control
          </Button>
          <Button onClick={() => navigate("/")} variant="outline">
            Return to Home
          </Button>
          {adminType === 'super' && (
            <Button onClick={() => navigate("/admin/register")} variant="outline">
              Register Admin
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <DashboardStats />
        </TabsContent>
        
        <TabsContent value="collections" className="space-y-4">
          <CollectionManager />
        </TabsContent>
        
        <TabsContent value="creators" className="space-y-4">
          <CreatorsList />
        </TabsContent>
        
        <TabsContent value="applications" className="space-y-4">
          <CreatorApplications />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
