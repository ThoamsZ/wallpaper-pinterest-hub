
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();

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

