
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    // Automatically redirect to auth page after logging the error
    navigate("/auth", { replace: true });
  }, [location.pathname, navigate]);

  // Return null since we're redirecting anyway
  return null;
};

export default NotFound;
