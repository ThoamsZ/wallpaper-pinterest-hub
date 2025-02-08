
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Check session on mount and redirect if already authenticated
  useEffect(() => {
    console.log("Auth: Checking session");
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("Auth: Session found, redirecting to /");
        navigate("/");
      }
    };
    checkSession();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Auth: Handling auth", { isSignUp });

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });

        if (signUpError) {
          console.error("Sign up error:", signUpError);
          let errorMessage = signUpError.message;
          
          if (signUpError.message.includes("Password should be")) {
            errorMessage = "Password should be at least 6 characters long";
          }
          
          toast({
            title: "Sign up failed",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        // Check if email verification is required
        if (!signUpData.session) {
          toast({
            title: "Success",
            description: "Please check your email to verify your account",
          });
        } else {
          // If email verification is disabled, redirect to home
          navigate("/");
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error("Sign in error:", signInError);
          let errorMessage = "Invalid login credentials";
          
          // Provide more specific error messages
          if (signInError.message === "Email not confirmed") {
            errorMessage = "Please verify your email address before signing in";
          } else if (signInError.message.includes("Invalid credentials")) {
            errorMessage = "Invalid email or password";
          }
          
          toast({
            title: "Sign in failed",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        if (signInData.session) {
          navigate("/");
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    toast({
      title: "Guest Access",
      description: "Browsing as a guest. Some features may be limited.",
    });
    navigate("/");
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{isSignUp ? "Create Account" : "Sign In"}</h1>
          <p className="text-gray-600 mt-2">to continue to WallpaperHub</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>
        </form>

        <div className="text-center space-y-4">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline"
            disabled={isLoading}
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGuestAccess}
            disabled={isLoading}
          >
            继续以访客身份浏览
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
