
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UserSectionProps {
  isAuthenticated: boolean;
  userEmail: string;
  isAdmin: boolean;
  isAdminPanel: boolean;
  isButtonDisabled: boolean;
}

const UserSection = ({ 
  isAuthenticated, 
  userEmail, 
  isAdmin, 
  isAdminPanel,
  isButtonDisabled 
}: UserSectionProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = async () => {
    if (isButtonDisabled || isProcessing) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        });
        return;
      }
      
      queryClient.clear();
      navigate("/");
      toast({
        title: "Success",
        description: "Successfully logged out",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "An error occurred during logout",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 ml-auto">
      {isAuthenticated ? (
        <>
          {userEmail && (
            <span className="text-xs text-gray-600 hidden sm:inline truncate max-w-[150px]">
              {userEmail}
            </span>
          )}
          {isAdmin && !isAdminPanel && (
            <Button 
              variant="outline" 
              onClick={() => navigate("/admin-panel")}
              className="text-sm py-1.5"
              size="sm"
              disabled={isButtonDisabled}
            >
              Admin
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-sm py-1.5"
            size="sm"
            disabled={isButtonDisabled}
          >
            Logout
          </Button>
        </>
      ) : (
        <Button 
          onClick={() => navigate("/auth")}
          className="text-sm py-1.5"
          size="sm"
          disabled={isButtonDisabled}
        >
          Login
        </Button>
      )}
    </div>
  );
};

export default UserSection;
