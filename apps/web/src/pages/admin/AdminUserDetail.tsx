import type { AdminUserSummary, Role } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { deleteAdminUser, fetchAdminUser, updateAdminUser } from "../../api/admin.js";

const ROLE_LABEL: Record<Role, string> = {
  worker: "Teletrabajador",
  supervisor: "Supervisor",
  admin: "Admin",
};

function EditUserForm({ user, onSaved }: { user: AdminUserSummary; onSaved: () => void }) {
  const [fullName, setFullName] = useState(user.fullName);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(String(user.weeklyTargetHours));
  const [isActive, setIsActive] = useState(user.isActive);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateAdminUser(user.id, {
        fullName,
        isActive,
        weeklyTargetHours: user.role === "worker" ? Number(weeklyTargetHours) : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <h3>Editar cuenta</h3>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Nombre completo</span>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input value={user.email} disabled />
        </label>
        <label>
          <span>Rol</span>
          <input value={ROLE_LABEL[user.role]} disabled />
        </label>
        {user.role === "worker" && (
          <label>
            <span>Horas objetivo semanales</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={weeklyTargetHours}
              onChange={(e) => setWeeklyTargetHours(e.target.value)}
            />
          </label>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span style={{ margin: 0 }}>Cuenta activa</span>
        </label>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

function DeleteUserCard({ user }: { user: AdminUserSummary }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar la cuenta de ${user.fullName}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAdminUser(user.id);
      navigate("/admin/users", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
      setIsDeleting(false);
    }
  }

  return (
    <div className="card">
      <h3>Eliminar cuenta</h3>
      <p>
        Si esta cuenta tiene proyectos, tareas o historial asociado, no se podrá eliminar hasta
        reasignar o quitar esos datos primero.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <button type="button" className="secondary" disabled={isDeleting} onClick={handleDelete}>
        {isDeleting ? "Eliminando…" : "Eliminar cuenta"}
      </button>
    </div>
  );
}

export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    fetchAdminUser(id)
      .then(setUser)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la cuenta"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!id) return null;

  return (
    <div className="dashboard-grid">
      <div>
        <Link to="/admin/users">← Volver a usuarios</Link>
      </div>
      <h2>{user?.fullName ?? "Cuenta"}</h2>
      {error && <div className="error-banner">{error}</div>}

      {user && (
        <>
          {user.role === "worker" && (
            <div className="card">
              <h3>Proyecto</h3>
              {user.currentProjectId ? (
                <p>
                  Actualmente en{" "}
                  <Link to={`/admin/projects/${user.currentProjectId}`}>
                    {user.currentProjectName}
                  </Link>
                  . Para cambiarlo de proyecto, gestiona la membresía desde la ficha del proyecto.
                </p>
              ) : (
                <p>No está asignado a ningún proyecto.</p>
              )}
            </div>
          )}

          {user.role === "supervisor" && (
            <div className="card">
              <h3>Proyectos que supervisa</h3>
              {user.supervisedProjects.length === 0 ? (
                <p>No supervisa ningún proyecto todavía.</p>
              ) : (
                <ul className="team-list">
                  {user.supervisedProjects.map((p) => (
                    <li key={p.id} className="team-list__item">
                      <Link to={`/admin/projects/${p.id}`}>{p.name}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="dashboard-grid__row">
            <EditUserForm user={user} onSaved={load} />
            <DeleteUserCard user={user} />
          </div>
        </>
      )}
    </div>
  );
}
