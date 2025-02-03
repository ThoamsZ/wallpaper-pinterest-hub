import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const CreatorProfile = () => {
  const { creatorCode } = useParams();
  const [activeTab, setActiveTab] = useState("wallpapers");

  // Fetch creator's user ID using creator code
  const { data: creatorData, isLoading: isCreatorLoading } = useQuery({
    queryKey: ['creator', creatorCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, creator_code')
        .eq('creator_code', creatorCode)
        .maybeSingle();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch creator information",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) {
        toast({
          title: "Not Found",
          description: "Creator not found",
          variant: "destructive",
        });
        throw new Error("Creator not found");
      }

      return data;
    },
    enabled: !!creatorCode,
  });

  // Fetch wallpapers uploaded by the creator
  const { data: wallpapers = [], isLoading: isWallpapersLoading } = useQuery({
    queryKey: ['creator-wallpapers', creatorData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', creatorData.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch wallpapers",
          variant: "destructive",
        });
        throw error;
      }

      return data || [];
    },
    enabled: !!creatorData?.id,
  });

  // Fetch collections created by the creator
  const { data: collections = [], isLoading: isCollectionsLoading } = useQuery({
    queryKey: ['creator-collections', creatorData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('created_by', creatorData.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch collections",
          variant: "destructive",
        });
        throw error;
      }

      return data || [];
    },
    enabled: !!creatorData?.id,
  });

  const isLoading = isCreatorLoading || isWallpapersLoading || isCollectionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto pt-20">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Creator Profile</h1>
          <p className="text-muted-foreground">Creator Code: {creatorCode}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="wallpapers">
              Wallpapers ({wallpapers.length})
            </TabsTrigger>
            <TabsTrigger value="collections">
              Collections ({collections.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallpapers">
            {wallpapers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No wallpapers found</p>
              </div>
            ) : (
              <WallpaperGrid wallpapers={wallpapers} />
            )}
          </TabsContent>

          <TabsContent value="collections">
            {collections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No collections found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm"
                  >
                    <h3 className="text-lg font-semibold mb-2">{collection.name}</h3>
                    {collection.description && (
                      <p className="text-muted-foreground mb-4">{collection.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(collection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CreatorProfile;