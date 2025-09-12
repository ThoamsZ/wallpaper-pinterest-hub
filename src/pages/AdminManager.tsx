
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
  Ban,
  LayoutDashboard,
  Users,
  UserPlus,
  Search,
  Check,
  UserX,
  Upload,
  Trash2,
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
import { AdminManagerAuth } from "@/components/admin/AdminManagerAuth";
import { CreatorsList } from "@/components/admin/CreatorsList";
import { CreatorApplications } from "@/components/admin/CreatorApplications";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { UploadRequests } from "@/components/admin/UploadRequests";
import { DeleteRequests } from "@/components/admin/DeleteRequests";

const AdminManager = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminManagerStatus();
  }, []);

  const checkAdminManagerStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select()
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) {
        console.error('Admin check error:', adminError);
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      }

      if (!adminData) {
        console.log('Not an admin');
        setIsLoggedIn(false);
        navigate('/admin-panel');
        setIsLoading(false);
        return;
      }

      setIsLoggedIn(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking admin manager status:', error);
      setIsLoggedIn(false);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminManagerAuth setIsLoggedIn={setIsLoggedIn} />;
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
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === 'uploads'} 
                  onClick={() => setActiveTab('uploads')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span>Upload Requests</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === 'deletes'} 
                  onClick={() => setActiveTab('deletes')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Delete Requests</span>
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
              {activeTab === 'uploads' && 'Upload Requests'}
              {activeTab === 'deletes' && 'Delete Requests'}
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

          {activeTab === 'stats' && <DashboardStats />}
          {activeTab === 'creators' && <CreatorsList navigate={navigate} />}
          {activeTab === 'applications' && <CreatorApplications />}
          {activeTab === 'uploads' && <UploadRequests />}
          {activeTab === 'deletes' && <DeleteRequests />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminManager;
