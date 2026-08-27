import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { NotificationBell } from "../components/NotificationBell.js";
import {
  IconActivity,
  IconCalendar,
  IconDashboard,
  IconFolder,
  IconGraduationCap,
  IconHistory,
  IconSettings,
  IconTasks,
  IconUsers,
} from "../components/NavIcons.js";
import { UserMenu } from "../components/UserMenu.js";

export function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          ClearWork
        </Link>

        {user?.role === "admin" && (
          <nav className="app-header__nav">
            <NavLink to="/admin" end>
              <IconDashboard />
              <span>Panel</span>
            </NavLink>
            <NavLink to="/admin/users">
              <IconUsers />
              <span>Usuarios</span>
            </NavLink>
            <NavLink to="/admin/projects">
              <IconFolder />
              <span>Proyectos</span>
            </NavLink>
            <NavLink to="/admin/activity">
              <IconActivity />
              <span>Actividad</span>
            </NavLink>
            <NavLink to="/admin/settings">
              <IconSettings />
              <span>Ajustes</span>
            </NavLink>
            <NavLink to="/admin/trainings">
              <IconGraduationCap />
              <span>Formaciones</span>
            </NavLink>
          </nav>
        )}

        {user?.role === "worker" && (
          <nav className="app-header__nav">
            <NavLink to="/worker" end>
              <IconDashboard />
              <span>Panel</span>
            </NavLink>
            <NavLink to="/worker/tasks">
              <IconTasks />
              <span>Tareas</span>
            </NavLink>
            <NavLink to="/worker/history">
              <IconHistory />
              <span>Historial</span>
            </NavLink>
            <NavLink to="/worker/vacations">
              <IconCalendar />
              <span>Vacaciones</span>
            </NavLink>
            <NavLink to="/worker/trainings">
              <IconGraduationCap />
              <span>Formaciones</span>
            </NavLink>
          </nav>
        )}

        {user?.role === "supervisor" && (
          <nav className="app-header__nav">
            <NavLink to="/supervisor" end>
              <IconDashboard />
              <span>Panel</span>
            </NavLink>
            <NavLink to="/supervisor/tasks">
              <IconTasks />
              <span>Tareas</span>
            </NavLink>
            <NavLink to="/supervisor/projects">
              <IconFolder />
              <span>Proyectos</span>
            </NavLink>
            <NavLink to="/supervisor/vacations">
              <IconCalendar />
              <span>Vacaciones</span>
            </NavLink>
            <NavLink to="/supervisor/trainings">
              <IconGraduationCap />
              <span>Formaciones</span>
            </NavLink>
          </nav>
        )}

        {(user?.role === "worker" || user?.role === "supervisor") && (
          <NotificationBell role={user.role} />
        )}
        <UserMenu />
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
