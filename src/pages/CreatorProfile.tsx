import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, Grid, List } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import WallpaperGrid from "@/components/WallpaperGrid";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['collections']['Row'];
type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const CreatorProfile = () => {
  const { creatorCode } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "date">("default");
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCreatorData = async () => {
      if (!creatorCode) return;

      try {
        // First get the creator's user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('creator_code', creatorCode)
          .maybeSingle();

        if (userError) throw userError;
        if (!userData) {
          console.error('Creator not found');
          return;
        }

        setCreatorId(userData.id);

        // Fetch wallpapers
        const { data: wallpaperData, error: wallpaperError } = await supabase
          .from('wallpapers')
          .select('*')
          .eq('uploaded_by', userData.id)
          .order('created_at', { ascending: false });

        if (wallpaperError) throw wallpaperError;
        setWallpapers(wallpaperData);

        // Fetch collections
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections')
          .select('*')
          .eq('created_by', userData.id)
          .order('created_at', { ascending: false });

        if (collectionError) throw collectionError;
        setCollections(collectionData);

      } catch (error) {
        console.error('Error fetching creator data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatorData();
  }, [creatorCode]);

  const filteredWallpapers = wallpapers
    .filter(wallpaper => 
      searchQuery === "" || 
      wallpaper.tags?.some(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0; // default sorting
    });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 pt-20">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-16 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-20">
      {/* Top Information */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback>
              {creatorCode?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Creator: {creatorCode}</h1>
            <p className="text-gray-500">
              {wallpapers.length} wallpapers · {collections.length} collections
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search by tags..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === "default" ? "secondary" : "ghost"}
              onClick={() => setSortBy("default")}
            >
              <Grid className="mr-2 h-4 w-4" />
              Default
            </Button>
            <Button
              variant={sortBy === "date" ? "secondary" : "ghost"}
              onClick={() => setSortBy("date")}
            >
              <List className="mr-2 h-4 w-4" />
              Date
            </Button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="wallpapers" className="w-full">
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="wallpapers">
            Wallpapers ({filteredWallpapers.length})
          </TabsTrigger>
          <TabsTrigger value="collections">
            Collections ({collections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallpapers">
          <WallpaperGrid wallpapers={filteredWallpapers} />
        </TabsContent>

        <TabsContent value="collections">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/collections/${collection.id}`)}
              >
                <h3 className="font-semibold mb-2">{collection.name}</h3>
                {collection.description && (
                  <p className="text-gray-500 text-sm">{collection.description}</p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreatorProfile;