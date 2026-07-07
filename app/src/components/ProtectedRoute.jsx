import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }) {
  const { medico, loading } = useAuth();

  if (loading) return null;
  if (!medico) return <Navigate to="/login" replace />;

  return children;
}
