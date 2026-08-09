import type { AdminUserSummary, Role } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api/client.js";
import { createAdminUser, fetchAdminUsers, updateAdminUser } from "../../api/admin.js";

const ROLE_LABEL: Record<Role, string> = {
  worker: "Teletrabajador",
  supervisor: "Supervisor",
  admin: "Admin",
};

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
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(user.weeklyTargetHours));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setError(null);
    setIsSaving(true);
    try {
      await updateAdminUser(user.id, { isActive: !user.isActive });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveTarget() {
    setError(null);
    setIsSaving(true);
    try {
      await updateAdminUser(user.id, { weeklyTargetHours: Number(targetInput) });
      setIsEditingTarget(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <tr>
      <td>{user.fullName}</td>
      <td>{user.email}</td>
      <td>{ROLE_LABEL[user.role]}</td>
      <td>{user.isActive ? "Sí" : "No"}</td>
      <td>
        {user.role === "worker" ? (
          isEditingTarget ? (
            <span className="inline-edit">
              <input
                type="number"
                min="1"
                step="0.5"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
              />
              <button type="button" disabled={isSaving} onClick={saveTarget}>
                Guardar
              </button>
              <button type="button" className="secondary" onClick={() => setIsEditingTarget(false)}>
                Cancelar
              </button>
            </span>
          ) : (
            <span className="inline-edit">
              {user.weeklyTargetHours} h
              <button type="button" className="secondary" onClick={() => setIsEditingTarget(true)}>
                Editar
              </button>
            </span>
          )
        ) : (
          "—"
        )}
      </td>
      <td>{user.role === "worker" ? (user.currentProjectName ?? "Sin proyecto") : "—"}</td>
      <td>
        <button type="button" className="secondary" disabled={isSaving} onClick={toggleActive}>
          {user.isActive ? "Desactivar" : "Activar"}
        </button>
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
                  <th>Activo</th>
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
