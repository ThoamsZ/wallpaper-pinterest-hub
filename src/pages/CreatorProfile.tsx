import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import WallpaperGrid from "@/components/WallpaperGrid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['collections']['Row'];
type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const CreatorProfile = () => {
  const navigate = useNavigate();
  const { creatorCode } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "date">("default");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCreatorData = async () => {
      if (!creatorCode) return;

      try {
        // First, get the creator's ID from their creator code
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('creator_code', creatorCode)
          .maybeSingle();

        if (userError) throw userError;
        if (!userData) {
          toast({
            title: "Creator not found",
            description: "No creator found with this code",
            variant: "destructive",
          });
          navigate('/');
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
        toast({
          title: "Error",
          description: "Failed to load creator data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatorData();
  }, [creatorCode, navigate]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Filter wallpapers based on tags
    const filteredWallpapers = wallpapers.filter(wallpaper => 
      wallpaper.tags?.some(tag => 
        tag.toLowerCase().includes(query.toLowerCase())
      )
    );
    setWallpapers(filteredWallpapers);
  };

  const handleSort = (type: "default" | "date") => {
    setSortBy(type);
    const sortedWallpapers = [...wallpapers].sort((a, b) => {
      if (type === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      // Default sorting (by like_count)
      return (b.like_count || 0) - (a.like_count || 0);
    });
    setWallpapers(sortedWallpapers);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-32"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Avatar className="h-12 w-12">
          <AvatarFallback>
            {creatorCode?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">Creator: {creatorCode}</h1>
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => handleSort("default")}
              className={`text-sm ${sortBy === "default" ? "text-primary" : "text-gray-500"}`}
            >
              Default
            </button>
            <button
              onClick={() => handleSort("date")}
              className={`text-sm ${sortBy === "date" ? "text-primary" : "text-gray-500"}`}
            >
              Date
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-8">
        <Input
          type="search"
          placeholder="Search by tags..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="wallpapers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="wallpapers">
            Wallpapers ({wallpapers.length})
          </TabsTrigger>
          <TabsTrigger value="collections">
            Collections ({collections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallpapers">
          <WallpaperGrid wallpapers={wallpapers} />
        </TabsContent>

        <TabsContent value="collections">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/collections/${collection.id}`)}
              >
                <h3 className="font-semibold">{collection.name}</h3>
                {collection.description && (
                  <p className="text-sm text-gray-500 mt-1">{collection.description}</p>
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