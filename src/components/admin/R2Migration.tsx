import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Upload, CheckCircle, AlertTriangle } from "lucide-react";

interface MigrationStats {
  total: number;
  migrated: number;
  remaining: number;
  errors: string[];
}

const R2Migration = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<MigrationStats | null>(null);
  const [progress, setProgress] = useState(0);

  const checkMigrationStatus = async () => {
    try {
      const { data: allWallpapers, error: totalError } = await supabase
        .from('wallpapers')
        .select('id', { count: 'exact', head: true });

      const { data: migratedWallpapers, error: migratedError } = await supabase
        .from('wallpapers')
        .select('id', { count: 'exact', head: true })
        .not('r2_key', 'is', null);

      if (totalError || migratedError) {
        throw new Error('Failed to fetch migration status');
      }

      const total = allWallpapers?.length || 0;
      const migrated = migratedWallpapers?.length || 0;
      const remaining = total - migrated;

      setMigrationStats({
        total,
        migrated,
        remaining,
        errors: []
      });

      setProgress(total > 0 ? (migrated / total) * 100 : 0);

    } catch (error) {
      console.error('Error checking migration status:', error);
      toast({
        title: "Error",
        description: "Failed to check migration status",
        variant: "destructive",
      });
    }
  };

  const runMigrationBatch = async (batchSize: number = 10) => {
    try {
      setIsMigrating(true);

      const { data, error } = await supabase.functions.invoke('migrate-to-r2', {
        body: { batchSize }
      });

      if (error) {
        throw error;
      }

      if (data.errors && data.errors.length > 0) {
        console.warn('Migration batch completed with errors:', data.errors);
        setMigrationStats(prev => prev ? {
          ...prev,
          errors: [...prev.errors, ...data.errors]
        } : null);
      }

      toast({
        title: "Migration Batch Complete",
        description: `Migrated ${data.migrated} out of ${data.total} wallpapers in this batch`,
      });

      // Refresh status
      await checkMigrationStatus();

    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Error",
        description: error.message || "Failed to run migration batch",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const runFullMigration = async () => {
    if (!migrationStats) return;

    const batchSize = 10;
    const totalBatches = Math.ceil(migrationStats.remaining / batchSize);
    
    setIsMigrating(true);
    
    try {
      for (let i = 0; i < totalBatches; i++) {
        await runMigrationBatch(batchSize);
        
        // Add a small delay between batches to avoid overwhelming the system
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Check if migration is complete
        await checkMigrationStatus();
        if (migrationStats.remaining === 0) {
          break;
        }
      }

      toast({
        title: "Migration Complete",
        description: "All wallpapers have been migrated to R2",
      });

    } catch (error) {
      console.error('Full migration error:', error);
      toast({
        title: "Migration Error",
        description: "Migration was interrupted. You can resume by running it again.",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">R2 Storage Migration</h2>
        <Button 
          onClick={checkMigrationStatus}
          variant="outline"
          size="sm"
          disabled={isMigrating}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {migrationStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Wallpapers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{migrationStats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Migrated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{migrationStats.migrated}</div>
              <Badge variant="secondary" className="mt-1">
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{migrationStats.remaining}</div>
              <Badge variant="outline" className="mt-1">
                <Upload className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {migrationStats && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-muted-foreground">
              {progress.toFixed(1)}% complete ({migrationStats.migrated} of {migrationStats.total} wallpapers)
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => runMigrationBatch(10)}
                disabled={isMigrating || migrationStats.remaining === 0}
                variant="outline"
              >
                {isMigrating ? "Running..." : "Run Batch (10 files)"}
              </Button>
              
              <Button
                onClick={runFullMigration}
                disabled={isMigrating || migrationStats.remaining === 0}
              >
                {isMigrating ? "Migrating..." : `Migrate All (${migrationStats.remaining} remaining)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {migrationStats?.errors && migrationStats.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Migration Errors:</div>
            <ul className="mt-2 list-disc list-inside text-sm">
              {migrationStats.errors.slice(0, 5).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {migrationStats.errors.length > 5 && (
                <li>... and {migrationStats.errors.length - 5} more errors</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!migrationStats && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Click "Refresh Status" to check migration progress
              </p>
              <Button onClick={checkMigrationStatus}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Migration Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default R2Migration;