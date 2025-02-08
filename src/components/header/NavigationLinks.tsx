
import { Archive, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface NavigationLinksProps {
  isAuthenticated: boolean;
  isButtonDisabled: boolean;
  isAdminPanel: boolean;
}

const NavigationLinks = ({ isAuthenticated, isButtonDisabled, isAdminPanel }: NavigationLinksProps) => {
  const navigate = useNavigate();

  const handleNavigation = async (path: string) => {
    if (isButtonDisabled) return;
    
    if ((path === '/collections' || path === '/likes') && !isAuthenticated) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
    }
    
    navigate(path);
  };

  if (isAdminPanel) return null;

  return (
    <>
      <button 
        onClick={() => handleNavigation("/")}
        className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors`}
        disabled={isButtonDisabled}
      >
        Explore
      </button>
      {isAuthenticated && (
        <>
          <button 
            onClick={() => handleNavigation("/collections")}
            className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`}
            disabled={isButtonDisabled}
          >
            <Archive className="w-4 h-4" />
            Collections
          </button>
          <button 
            onClick={() => handleNavigation("/likes")}
            className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`}
            disabled={isButtonDisabled}
          >
            <Heart className="w-4 h-4" />
            Likes
          </button>
        </>
      )}
    </>
  );
};

export default NavigationLinks;
