import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto pt-20">
        <WallpaperGrid />
      </main>
    </div>
  );
};

export default Index;