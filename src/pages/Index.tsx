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
      <main className="pt-28 px-2 sm:px-4">
        <WallpaperGrid key={session?.user?.id} />
      </main>
    </div>
  );
};

export default Index;