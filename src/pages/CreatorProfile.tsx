import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WallpaperGrid from "@/components/WallpaperGrid";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];
type Collection = Database['public']['Tables']['collections']['Row'];

const CreatorProfile = () => {
  const navigate = useNavigate();
  const { creatorCode } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "date">("default");
  const [activeTab, setActiveTab] = useState<"wallpapers" | "collections">("wallpapers");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreatorContent = async () => {
      if (!creatorCode) return;

      setIsLoading(true);
      try {
        // First get the creator's user ID
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
          .order(sortBy === 'date' ? 'created_at' : 'like_count', { ascending: false });

        if (wallpaperError) throw wallpaperError;
        setWallpapers(wallpaperData || []);

        // Fetch collections
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections')
          .select('*')
          .eq('created_by', userData.id)
          .order(sortBy === 'date' ? 'created_at' : 'name', { ascending: true });

        if (collectionError) throw collectionError;
        setCollections(collectionData || []);

      } catch (error) {
        console.error('Error fetching creator content:', error);
        toast({
          title: "Error",
          description: "Failed to load creator content",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatorContent();
  }, [creatorCode, sortBy]);

  const filteredWallpapers = wallpapers.filter(wallpaper => 
    !searchQuery || wallpaper.tags?.some(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredCollections = collections.filter(collection =>
    !searchQuery || 
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (collection.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 pt-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{creatorCode}</h1>
              <p className="text-sm text-gray-500">Creator</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="border rounded-md px-3 py-2"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "default" | "date")}
          >
            <option value="default">Default</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md w-full mx-auto">
          <Input
            type="search"
            placeholder="Search by tags or collection names..."
            className="pl-10 pr-4 py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "wallpapers" | "collections")}>
        <TabsList className="mb-6">
          <TabsTrigger value="wallpapers">
            Wallpapers ({wallpapers.length})
          </TabsTrigger>
          <TabsTrigger value="collections">
            Collections ({collections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallpapers">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <WallpaperGrid wallpapers={filteredWallpapers} />
          )}
        </TabsContent>

        <TabsContent value="collections">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map((collection) => (
                <div
                  key={collection.id}
                  className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/collections/${collection.id}`)}
                >
                  <h3 className="font-semibold mb-2">{collection.name}</h3>
                  {collection.description && (
                    <p className="text-sm text-gray-500">{collection.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreatorProfile;