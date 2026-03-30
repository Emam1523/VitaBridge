import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthenticationContext";

// This component redirects authenticated users to their respective dashboards based on their roles.
export default function RedirectAuthenticated({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const role = user?.role?.toUpperCase();
    const dashboardPath =
      role === "ADMIN"     ? "/admin/dashboard" :
      role === "DOCTOR"    ? "/doctor/dashboard" :
      role === "ASSISTANT" ? "/assistant/dashboard" :
                             "/patient/dashboard";
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
}
