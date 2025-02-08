import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);

  // **防止 session 加载时页面崩溃**
  useEffect(() => {
    if (session === null) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [session]);

  // **✅ 只在 session === undefined 且访问受保护页面时跳转 /auth**
  useEffect(() => {
    const protectedPages = ["/likes", "/collections", "/upload"];
    
    if (session === null) {
      console.log("🟡 session is still null, skipping redirect...");
      return;
    }

    if (!session && protectedPages.includes(window.location.pathname)) {
      console.log("🔴 Redirecting to /auth because session is missing.");
      queryClient.clear();
      navigate("/auth");
    } else {
      console.log("✅ No redirect needed.");
    }
  }, [session, navigate, queryClient]);

  if (loading) {
    return <div>Loading session...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isDisabled={false} />
      <WallpaperGrid />
    </div>
  );
};

export default Index;
