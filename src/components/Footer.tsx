
import { Mail, Link, Copyright } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full py-6 mt-8 border-t bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Copyright className="h-4 w-4" />
            <span>2025 XXWallpaper. All Rights Reserved.</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="mailto:xxwallpaperofficial@gmail.com" 
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Contact Us</span>
            </a>
            
            <a 
              href="/policy"
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Link className="h-4 w-4" />
              <span>Policy</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
