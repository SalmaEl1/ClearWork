import type { AdminUserSummary, Role } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { createAdminUser, deleteAdminUser, fetchAdminUsers } from "../../api/admin.js";

const ROLE_LABEL: Record<Role, string> = {
  worker: "Teletrabajador",
  supervisor: "Supervisor",
  admin: "Admin",
};

/** Para un teletrabajador es el proyecto del que es miembro (0 o 1); para
 * un supervisor, los proyectos que supervisa (puede llevar varios). */
function projectColumnText(user: AdminUserSummary): string {
  if (user.role === "worker") {
    return user.currentProjectName ?? "Sin proyecto";
  }
  if (user.role === "supervisor") {
    return user.supervisedProjects.length === 0
      ? "Sin proyecto"
      : user.supervisedProjects.map((p) => p.name).join(", ");
  }
  return "—";
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"worker" | "supervisor">("worker");
  const [weeklyTargetHours, setWeeklyTargetHours] = useState("40");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createAdminUser({
        email,
        password,
        fullName,
        role,
        weeklyTargetHours: role === "worker" ? Number(weeklyTargetHours) : undefined,
      });
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("worker");
      setWeeklyTargetHours("40");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h3>Crear cuenta</h3>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Nombre completo</span>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          <span>Contraseña</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          <span>Rol</span>
          <select value={role} onChange={(e) => setRole(e.target.value as "worker" | "supervisor")}>
            <option value="worker">Teletrabajador</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </label>
        {role === "worker" && (
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
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}

function UserRow({
  user,
  onChanged,
}: {
  user: AdminUserSummary;
  onChanged: () => void;
}) {
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
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
      setIsDeleting(false);
    }
  }

  return (
    <tr>
      <td>{user.fullName}</td>
      <td>{user.email}</td>
      <td>{ROLE_LABEL[user.role]}</td>
      <td>{user.role === "worker" ? `${user.weeklyTargetHours} h` : "—"}</td>
      <td>{projectColumnText(user)}</td>
      <td>
        <div className="row-actions">
          <Link to={`/admin/users/${user.id}`}>Ver</Link>
          <button type="button" className="secondary" disabled={isDeleting} onClick={handleDelete}>
            Eliminar
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </td>
    </tr>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-grid">
      <h2>Usuarios</h2>
      {error && <div className="error-banner">{error}</div>}

      <CreateUserForm onCreated={load} />

      <div className="card">
        <h3>Todas las cuentas</h3>
        {users && users.length === 0 && <p>Todavía no hay supervisores ni teletrabajadores.</p>}
        {users && users.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Horas objetivo</th>
                  <th>Proyecto actual</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow key={u.id} user={u} onChanged={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
