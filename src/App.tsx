import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Collections from "./pages/Collections";
import AdminPanel from "./pages/AdminPanel";
import Upload from "./pages/Upload";
import NotFound from "./pages/NotFound";
import CreatorProfile from "./pages/CreatorProfile";
import "./App.css";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/creator/:creatorCode" element={<CreatorProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;