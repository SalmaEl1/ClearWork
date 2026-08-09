import { Navigate, createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth.js";
import { RequireRole } from "./auth/RequireRole.js";
import { useAuth } from "./auth/AuthContext.js";
import { AppLayout } from "./layouts/AppLayout.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { SupervisorHome } from "./pages/supervisor/SupervisorHome.js";
import { WorkerHome } from "./pages/worker/WorkerHome.js";

/** Punto de entrada "/": manda a cada usuario a la vista de su rol. */
function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "worker" ? "/worker" : "/supervisor"} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <RoleHomeRedirect /> },
          {
            element: <RequireRole role="worker" />,
            children: [{ path: "/worker", element: <WorkerHome /> }],
          },
          {
            element: <RequireRole role="supervisor" />,
            children: [{ path: "/supervisor", element: <SupervisorHome /> }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
