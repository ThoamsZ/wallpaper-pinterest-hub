import { useAuth } from "@/hooks/useAuth"; 
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session === null) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [session]);

  // ✅ **修正逻辑：只有在 session 确定是 null 并且访问受保护页面时，才跳转 /auth**
  useEffect(() => {
    const protectedPages = ["/likes", "/collections", "/upload"];
    if (session === null) {
      console.log("Session is still loading, not redirecting.");
      return;
    }

    if (!session && protectedPages.includes(window.location.pathname)) {
      console.log("🔒 Redirecting to /auth because session is missing.");
      queryClient.clear();
      navigate("/auth");
    }
  }, [session, navigate, queryClient]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isDisabled={false} />
      <h1>Welcome to the Index Page!</h1>
    </div>
  );
};

export default Index;
