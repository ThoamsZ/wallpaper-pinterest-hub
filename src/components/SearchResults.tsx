import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Grid, Heart, Calendar, Eye } from "lucide-react";
import WallpaperGrid from "./WallpaperGrid";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];
type Collection = Database['public']['Tables']['collections']['Row'];

interface SearchResultsProps {
  results: {
    wallpapers: Wallpaper[];
    collections: Collection[];
    creatorInfo: {
      creator_code: string;
      email: string;
      user_id: string;
    } | null;
  };
  searchQuery: string;
  onClear: () => void;
}

export const SearchResults = ({ results, searchQuery, onClear }: SearchResultsProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("wallpapers");

  const { wallpapers, collections, creatorInfo } = results;
  const totalResults = wallpapers.length + collections.length;

  if (totalResults === 0 && !creatorInfo) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground mb-4">
            No wallpapers, collections, or creators found for "{searchQuery}"
          </p>
          <Button onClick={onClear} variant="outline">
            Clear Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Search Results for "{searchQuery}"
          </h2>
          {creatorInfo ? (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Creator Found: {creatorInfo.creator_code}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/creator/${creatorInfo.creator_code}`)}
              >
                View Profile
              </Button>
            </div>
          ) : null}
          <p className="text-muted-foreground">
            Found {totalResults} result{totalResults !== 1 ? 's' : ''} 
            ({wallpapers.length} wallpaper{wallpapers.length !== 1 ? 's' : ''}, {collections.length} collection{collections.length !== 1 ? 's' : ''})
          </p>
        </div>
        <Button onClick={onClear} variant="outline">
          Clear Search
        </Button>
      </div>

      {/* Creator Info Card */}
      {creatorInfo && (
        <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Creator: {creatorInfo.creator_code}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email: {creatorInfo.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Content: {wallpapers.length} wallpapers, {collections.length} collections
                </p>
              </div>
              <Button
                onClick={() => navigate(`/creator/${creatorInfo.creator_code}`)}
                className="w-full sm:w-auto"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Full Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="wallpapers" className="flex items-center gap-2">
            <Grid className="w-4 h-4" />
            Wallpapers ({wallpapers.length})
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Collections ({collections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallpapers" className="mt-6">
          {wallpapers.length > 0 ? (
            <WallpaperGrid wallpapers={wallpapers} />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No wallpapers found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections" className="mt-6">
          {collections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <Card
                  key={collection.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/collection/${collection.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{collection.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {collection.description && (
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(collection.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {collection.like_count || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No collections found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};