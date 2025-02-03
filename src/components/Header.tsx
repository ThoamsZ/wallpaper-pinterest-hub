import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">WallpaperHub</h1>
        <div className="relative max-w-md w-full mx-4">
          <Input
            type="search"
            placeholder="Search wallpapers..."
            className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-gray-600 hover:text-primary transition-colors">
            Explore
          </a>
          <a href="#" className="text-gray-600 hover:text-primary transition-colors">
            Collections
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;