
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useAuth } from "@/App";

const Index = () => {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header isDisabled={false} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <WallpaperGrid />
      </main>
    </div>
  );
};

export default Index;
