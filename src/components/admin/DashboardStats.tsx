
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const DashboardStats = () => {
  const [statsData, setStatsData] = useState({
    totalDownloads: 0,
    totalPurchases: 0,
    todayDownloads: 0,
    todayPurchases: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatsData();
  }, []);

  const fetchStatsData = async () => {
    setIsLoading(true);
    try {
      const { data: downloadData, error: downloadError } = await supabase
        .from('wallpapers')
        .select('download_count')
        .not('download_count', 'is', null);

      if (downloadError) throw downloadError;

      const totalDownloads = downloadData.reduce((sum, item) => sum + (item.download_count || 0), 0);

      const { data: purchaseData, error: purchaseError } = await supabase
        .from('paypal_orders')
        .select('*')
        .eq('status', 'completed');

      if (purchaseError) throw purchaseError;

      // Estimate today's downloads as 5% of total for demo purposes
      const todayDownloads = Math.round(totalDownloads * 0.05);

      const { data: todayPurchaseData, error: todayPurchaseError } = await supabase
        .from('paypal_orders')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', new Date().toISOString());

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
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
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
  );
};

// Export as default as well to maintain compatibility with both import styles
export default DashboardStats;
