
import { useLocation } from "react-router-dom";
import { useAuth } from "./header/useAuth";
import SearchBar from "./header/SearchBar";
import NavigationLinks from "./header/NavigationLinks";
import UserSection from "./header/UserSection";

interface HeaderProps {
  isDisabled?: boolean;
}

const Header = ({ isDisabled = false }: HeaderProps) => {
  const location = useLocation();
  const { isAuthenticated, isAdmin, userEmail } = useAuth();
  const isAdminPanel = location.pathname === "/admin-panel";
  const isButtonDisabled = isDisabled;

  return (
    <header className="bg-white/95 backdrop-blur-md z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 pb-6">
        <div className="flex flex-col gap-3">
          <div className="flex justify-center items-center gap-3">
            <h1 
              className={`text-xl font-bold ${isButtonDisabled ? 'text-gray-400' : 'text-primary cursor-pointer'}`}
            >
              xxWallpaper
            </h1>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <NavigationLinks 
              isAuthenticated={isAuthenticated}
              isButtonDisabled={isButtonDisabled}
              isAdminPanel={isAdminPanel}
            />
            <UserSection 
              isAuthenticated={isAuthenticated}
              userEmail={userEmail}
              isAdmin={isAdmin}
              isAdminPanel={isAdminPanel}
              isButtonDisabled={isButtonDisabled}
            />
          </div>

          {!isAdminPanel && (
            <SearchBar isDisabled={isDisabled} />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
