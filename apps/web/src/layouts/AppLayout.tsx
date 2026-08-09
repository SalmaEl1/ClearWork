import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";

const ROLE_LABEL = {
  worker: "Teletrabajador",
  supervisor: "Supervisor",
  admin: "Admin",
} as const;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__brand">ClearWork</span>

        {user?.role === "admin" && (
          <nav className="app-header__nav">
            <NavLink to="/admin/users">Usuarios</NavLink>
            <NavLink to="/admin/projects">Proyectos</NavLink>
          </nav>
        )}

        {user && (
          <div className="app-header__user">
            <Link to="/profile" className="app-header__profile-link">
              {user.fullName}
            </Link>
            <span className="role-badge">{ROLE_LABEL[user.role]}</span>
            <button type="button" className="secondary" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
