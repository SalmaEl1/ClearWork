import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
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
              Panel
            </NavLink>
            <NavLink to="/admin/users">Usuarios</NavLink>
            <NavLink to="/admin/projects">Proyectos</NavLink>
          </nav>
        )}

        <UserMenu />
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
