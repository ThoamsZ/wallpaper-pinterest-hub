import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Crown, Download } from "lucide-react";

const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalWallpapers: 0,
    totalUsers: 0,
    vipUsers: 0,
    totalDownloads: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get wallpapers count
      const { count: wallpapersCount } = await supabase
        .from('wallpapers')
        .select('*', { count: 'exact', head: true });

      // Get customers count  
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get VIP customers count
      const { count: vipCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .neq('vip_type', 'none');

      // Get total downloads from download_logs
      const { count: downloadsCount } = await supabase
        .from('download_logs')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalWallpapers: wallpapersCount || 0,
        totalUsers: customersCount || 0,
        vipUsers: vipCount || 0,
        totalDownloads: downloadsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Wallpapers</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalWallpapers}</div>
          <p className="text-xs text-muted-foreground">
            Total wallpapers uploaded
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            Registered customers
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">VIP Users</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.vipUsers}</div>
          <p className="text-xs text-muted-foreground">
            Active VIP subscribers
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
          <Download className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDownloads}</div>
          <p className="text-xs text-muted-foreground">
            All-time downloads
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;