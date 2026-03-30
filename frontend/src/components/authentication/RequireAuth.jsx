import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthenticationContext";

export default function RequireAuth({ allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect unauthenticated users to the login page, preserving the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified, check if user has required role
  if (allowedRoles && !allowedRoles.includes(user?.role?.toUpperCase())) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
