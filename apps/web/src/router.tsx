import { Navigate, createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth.js";
import { RequireRole } from "./auth/RequireRole.js";
import { useAuth } from "./auth/AuthContext.js";
import { roleHome } from "./auth/roleHome.js";
import { AppLayout } from "./layouts/AppLayout.js";
import { AdminProjectDetail } from "./pages/admin/AdminProjectDetail.js";
import { AdminProjects } from "./pages/admin/AdminProjects.js";
import { AdminUsers } from "./pages/admin/AdminUsers.js";
import { Login } from "./pages/Login.js";
import { Profile } from "./pages/Profile.js";
import { SupervisorHome } from "./pages/supervisor/SupervisorHome.js";
import { WorkerHome } from "./pages/worker/WorkerHome.js";

/** Punto de entrada "/": manda a cada usuario a la vista de su rol. */
function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <RoleHomeRedirect /> },
          { path: "/profile", element: <Profile /> },
          {
            element: <RequireRole role="worker" />,
            children: [{ path: "/worker", element: <WorkerHome /> }],
          },
          {
            element: <RequireRole role="supervisor" />,
            children: [{ path: "/supervisor", element: <SupervisorHome /> }],
          },
          {
            element: <RequireRole role="admin" />,
            children: [
              { path: "/admin/users", element: <AdminUsers /> },
              { path: "/admin/projects", element: <AdminProjects /> },
              { path: "/admin/projects/:id", element: <AdminProjectDetail /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
