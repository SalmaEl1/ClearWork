import type { Role } from "@clearwork/shared";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext.js";

/**
 * Filtro de UI por rol, análogo a `authorize()` en el backend: solo evita
 * que la interfaz muestre lo que no toca. La protección real de los datos
 * está en la API, que vuelve a comprobar el rol en cada petición.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();

  if (user && user.role !== role) {
    const home = user.role === "worker" ? "/worker" : "/supervisor";
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
