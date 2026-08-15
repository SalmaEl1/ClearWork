import type { AdminCreatableRole, AdminCreateUserResponse, AdminUserSummary } from "@clearwork/shared";
import { ADMIN_CREATABLE_ROLES } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.js";
import { ApiError } from "../../api/client.js";
import { createAdminUser, deleteAdminUser, fetchAdminUsers } from "../../api/admin.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { Modal } from "../../components/Modal.js";
import { ROLE_LABEL } from "../../constants.js";

type RoleFilter = AdminCreatableRole | "all";

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

function CreateResult({ result, onDone }: { result: AdminCreateUserResponse; onDone: () => void }) {
  return (
    <div>
      {result.passwordEmailSent ? (
        <div className="alert-banner status-ok">
          Cuenta creada. Se ha enviado un correo a <strong>{result.email}</strong> con la
          contraseña provisional.
        </div>
      ) : (
        <div className="alert-banner status-warning">
          <p style={{ margin: "0 0 0.5rem" }}>
            Cuenta creada, pero no se pudo enviar el correo. Comparte esta contraseña provisional
            manualmente:
          </p>
          <code className="password-reveal">{result.temporaryPassword}</code>
        </div>
      )}
      <button type="button" onClick={onDone} style={{ marginTop: "1rem" }}>
        Aceptar
      </button>
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AdminCreatableRole>("worker");
  const [weeklyTargetHours, setWeeklyTargetHours] = useState("40");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AdminCreateUserResponse | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createAdminUser({
        email,
        fullName,
        role,
        weeklyTargetHours: role === "worker" ? Number(weeklyTargetHours) : undefined,
      });
      setResult(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return <CreateResult result={result} onDone={onDone} />;
  }

  return (
    <>
      <p>La contraseña se genera sola y se envía por correo a la cuenta creada.</p>
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
          <span>Rol</span>
          <select value={role} onChange={(e) => setRole(e.target.value as AdminCreatableRole)}>
            {ADMIN_CREATABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
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
    </>
  );
}

function UserRow({
  user,
  isSelf,
  onChanged,
}: {
  user: AdminUserSummary;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAdminUser(user.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  }

  return (
    <tr>
      <td>
        {user.fullName}
        {isSelf && " (tú)"}
      </td>
      <td>{ROLE_LABEL[user.role]}</td>
      <td>{projectColumnText(user)}</td>
      <td>
        <div className="row-actions">
          <Link to={`/admin/users/${user.id}`} className="link-button">
            Ver
          </Link>
          <button
            type="button"
            className="secondary"
            disabled={isDeleting || isSelf}
            title={isSelf ? "No puedes eliminar tu propia cuenta" : undefined}
            onClick={() => setIsConfirmOpen(true)}
          >
            Eliminar
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {isConfirmOpen && (
          <ConfirmDialog
            title="Eliminar cuenta"
            message={`¿Eliminar la cuenta de ${user.fullName}? Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            isConfirming={isDeleting}
            onConfirm={handleDelete}
            onCancel={() => setIsConfirmOpen(false)}
          />
        )}
      </td>
    </tr>
  );
}

function matchesSearch(user: AdminUserSummary, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return user.fullName.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
}

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const load = useCallback(() => {
    fetchAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleDone() {
    setIsCreateOpen(false);
    load();
  }

  const filteredUsers = (users ?? []).filter(
    (u) => (roleFilter === "all" || u.role === roleFilter) && matchesSearch(u, search),
  );

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Usuarios</h2>
        <button type="button" onClick={() => setIsCreateOpen(true)}>
          + Añadir cuenta
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {isCreateOpen && (
        <Modal title="Crear cuenta" onClose={() => setIsCreateOpen(false)}>
          <CreateUserForm onDone={handleDone} />
        </Modal>
      )}

      <div className="card">
        <h3>Todas las cuentas</h3>
        {!users && !error && <p>Cargando…</p>}

        {users && users.length === 0 && <p>Todavía no hay supervisores ni teletrabajadores.</p>}

        {users && users.length > 0 && (
          <>
            <div className="filter-bar">
              <input
                type="search"
                placeholder="Buscar por nombre o email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}>
                <option value="all">Todos los roles</option>
                {ADMIN_CREATABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>

            {filteredUsers.length === 0 ? (
              <p>Ninguna cuenta coincide con la búsqueda.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Proyecto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <UserRow key={u.id} user={u} isSelf={u.id === currentUser?.id} onChanged={load} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
