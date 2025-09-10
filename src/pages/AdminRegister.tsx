
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminRegister = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Starting admin registration for email:", email);
      
      // First, check if the user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('admins')
        .select('email')
        .eq('email', email)
        .maybeSingle();
        
      if (existingUsers) {
        throw new Error("This email is already registered as an admin. Please login instead.");
      }
      
      // First sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (signUpError) {
        console.error("Sign up error:", signUpError);
        
        // Provide a more user-friendly error message for already registered users
        if (signUpError.code === "user_already_exists") {
          throw new Error("This email is already registered. Please use the login page instead.");
        }
        
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error("No user data returned");
      }

      console.log("User created successfully, creating admin record with ID:", signUpData.user.id);

      // Then create the admin user entry with email information
      const { error: adminError } = await supabase
        .from('admins')
        .insert([{ 
          user_id: signUpData.user.id,
          email: email,
          is_active: false  // Admin needs to be activated manually
        }]);

      if (adminError) {
        console.error("Admin creation error:", adminError);
        // Clean up the auth user if admin creation fails
        await supabase.auth.signOut();
        throw adminError;
      }

      console.log("Admin user created successfully");

      toast({
        title: "Registration successful",
        description: "Please wait for an admin manager to activate your account",
      });

      // Redirect to admin login page
      navigate("/admin/login");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Creator Registration</h1>
          <p className="text-gray-600 mt-2">Create a new creator account</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
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
            {isLoading ? "Processing..." : "Register Creator"}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => navigate("/admin/login")}
              disabled={isLoading}
            >
              Back to Admin Login
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRegister;
