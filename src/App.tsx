import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import AdminPanel from "@/pages/AdminPanel";
import Collections from "@/pages/Collections";
import Upload from "@/pages/Upload";
import NotFound from "@/pages/NotFound";
import CreatorProfile from "@/pages/CreatorProfile";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/creator/:creatorCode" element={<CreatorProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;