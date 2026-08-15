import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { ROLE_LABEL } from "../constants.js";
import { Avatar } from "./Avatar.js";

/**
 * Avatar en la cabecera que despliega nombre/rol, enlace al perfil y
 * cerrar sesión. Usado por AppLayout para cualquier rol: no tiene nada
 * específico de admin.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="Menú de usuario"
      >
        <Avatar fullName={user.fullName} />
      </button>

      {isOpen && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__info">
            <strong>{user.fullName}</strong>
            <span className="role-badge">{ROLE_LABEL[user.role]}</span>
          </div>
          <Link to="/profile" role="menuitem" onClick={() => setIsOpen(false)}>
            Perfil
          </Link>
          <button type="button" role="menuitem" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
