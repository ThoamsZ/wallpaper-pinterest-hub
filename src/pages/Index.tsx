import { useEffect, useState } from "react";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto pt-32 px-4 sm:px-6 lg:px-8">
        <WallpaperGrid key={session?.user?.id} />
      </main>
    </div>
  );
};

export default Index;