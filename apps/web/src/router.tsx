import { Navigate, createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth.js";
import { RequireRole } from "./auth/RequireRole.js";
import { useAuth } from "./auth/AuthContext.js";
import { roleHome } from "./auth/roleHome.js";
import { AppLayout } from "./layouts/AppLayout.js";
import { AdminActivity } from "./pages/admin/AdminActivity.js";
import { AdminHome } from "./pages/admin/AdminHome.js";
import { AdminProjectDetail } from "./pages/admin/AdminProjectDetail.js";
import { AdminProjects } from "./pages/admin/AdminProjects.js";
import { AdminSettings } from "./pages/admin/AdminSettings.js";
import { AdminUserDetail } from "./pages/admin/AdminUserDetail.js";
import { AdminUsers } from "./pages/admin/AdminUsers.js";
import { ChangePassword } from "./pages/ChangePassword.js";
import { ForgotPassword } from "./pages/ForgotPassword.js";
import { Login } from "./pages/Login.js";
import { Profile } from "./pages/Profile.js";
import { ResetPassword } from "./pages/ResetPassword.js";
import { SupervisorHome } from "./pages/supervisor/SupervisorHome.js";
import { SupervisorTasks } from "./pages/supervisor/SupervisorTasks.js";
import { WorkerHistory } from "./pages/worker/WorkerHistory.js";
import { WorkerHome } from "./pages/worker/WorkerHome.js";
import { WorkerTasks } from "./pages/worker/WorkerTasks.js";

/** Punto de entrada "/": manda a cada usuario a la vista de su rol. */
function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <RoleHomeRedirect /> },
          { path: "/profile", element: <Profile /> },
          { path: "/profile/password", element: <ChangePassword /> },
          {
            element: <RequireRole role="worker" />,
            children: [
              { path: "/worker", element: <WorkerHome /> },
              { path: "/worker/tasks", element: <WorkerTasks /> },
              { path: "/worker/history", element: <WorkerHistory /> },
            ],
          },
          {
            element: <RequireRole role="supervisor" />,
            children: [
              { path: "/supervisor", element: <SupervisorHome /> },
              { path: "/supervisor/tasks", element: <SupervisorTasks /> },
            ],
          },
          {
            element: <RequireRole role="admin" />,
            children: [
              { path: "/admin", element: <AdminHome /> },
              { path: "/admin/activity", element: <AdminActivity /> },
              { path: "/admin/users", element: <AdminUsers /> },
              { path: "/admin/users/:id", element: <AdminUserDetail /> },
              { path: "/admin/projects", element: <AdminProjects /> },
              { path: "/admin/projects/:id", element: <AdminProjectDetail /> },
              { path: "/admin/settings", element: <AdminSettings /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
