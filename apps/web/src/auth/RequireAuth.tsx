import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.js";

/** Exige sesión iniciada. Redirige a /login conservando la ruta de origen. */
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p>Cargando…</p>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
