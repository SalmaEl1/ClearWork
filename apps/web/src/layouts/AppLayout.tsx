import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";

const ROLE_LABEL = {
  worker: "Teletrabajador",
  supervisor: "Supervisor",
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
        {user && (
          <div className="app-header__user">
            <span>{user.fullName}</span>
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
