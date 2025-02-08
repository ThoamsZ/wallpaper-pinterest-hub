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
      setLoading(true); // 避免页面直接卡死
    } else {
      setLoading(false);
    }
  }, [session]);

  // 只有 session 是 `undefined`（代表未登录）时才跳转 `/auth`
  useEffect(() => {
    if (session === undefined) {
      console.log("Index: No session found, redirecting to /auth");
      queryClient.clear();
      navigate("/auth");
    }
  }, [session, navigate, queryClient]);

  if (loading) {
    return <div>Loading...</div>;  // 避免 return null 让页面卡死
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isDisabled={false} />
      <h1>Welcome to the Index Page!</h1>
    </div>
  );
};

export default Index;
