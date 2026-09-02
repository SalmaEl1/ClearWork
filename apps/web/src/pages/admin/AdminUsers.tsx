import type { AdminCreatableRole, AdminCreateUserResponse, AdminUserSummary } from "@clearwork/shared";
import { ADMIN_CREATABLE_ROLES } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.js";
import { ApiError } from "../../api/client.js";
import {
  createAdminUser,
  deleteAdminUser,
  exportAdminUsersCsv,
  fetchAdminUsers,
} from "../../api/admin.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { Modal } from "../../components/Modal.js";
import { Pagination } from "../../components/Pagination.js";
import { ROLE_LABEL } from "../../constants.js";

type RoleFilter = AdminCreatableRole | "all";

const DEFAULT_PAGE_SIZE = 10;

/** Para un trabajador es el proyecto del que es miembro (0 o 1); para
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
  isSelected,
  onToggleSelect,
  onChanged,
}: {
  user: AdminUserSummary;
  isSelf: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
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
        {!isSelf && (
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`Seleccionar a ${user.fullName}`}
          />
        )}
      </td>
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

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Igual que en AdminProjects: espera una pausa al teclear antes de
  // lanzar la búsqueda contra el servidor.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const load = useCallback(() => {
    fetchAdminUsers({
      search: search || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      page,
      pageSize,
    })
      .then((result) => {
        setUsers(result.items);
        setTotal(result.total);
        // Una página nueva (o la misma tras borrar) no comparte
        // selección con la anterior: evita "seleccionados fantasma" que
        // ya no están en pantalla.
        setSelectedIds(new Set());
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
  }, [search, roleFilter, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  function handleDone() {
    setIsCreateOpen(false);
    load();
  }

  function toggleSelect(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  const selectableUsers = (users ?? []).filter((u) => u.id !== currentUser?.id);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.has(u.id));

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(selectableUsers.map((u) => u.id)));
  }

  async function handleBulkDelete() {
    setError(null);
    setIsBulkDeleting(true);
    const failures: string[] = [];
    // Secuencial, no en paralelo: son pocas filas a la vez (una página),
    // y así el mensaje de error de una no se pisa con el de otra.
    for (const id of selectedIds) {
      const target = users?.find((u) => u.id === id);
      try {
        await deleteAdminUser(id);
      } catch (err) {
        failures.push(`${target?.fullName ?? id}: ${err instanceof ApiError ? err.message : "error desconocido"}`);
      }
    }
    setIsBulkDeleting(false);
    setIsBulkConfirmOpen(false);
    if (failures.length > 0) {
      setError(`No se pudieron eliminar ${failures.length} cuenta(s): ${failures.join("; ")}`);
    }
    load();
  }

  async function handleExport() {
    setError(null);
    setIsExporting(true);
    try {
      await exportAdminUsersCsv({
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo exportar");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Usuarios</h2>
        <div className="row-actions">
          <button type="button" className="secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exportando…" : "Exportar CSV"}
          </button>
          <button type="button" onClick={() => setIsCreateOpen(true)}>
            + Añadir cuenta
          </button>
        </div>
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

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Buscar por nombre o email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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

        {users && users.length === 0 && (
          <p>{search || roleFilter !== "all" ? "Ninguna cuenta coincide con la búsqueda." : "Todavía no hay supervisores ni trabajadores."}</p>
        )}

        {selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span>{selectedIds.size} seleccionado(s)</span>
            <button type="button" className="danger" onClick={() => setIsBulkConfirmOpen(true)}>
              Eliminar seleccionados
            </button>
          </div>
        )}

        {users && users.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                      disabled={selectableUsers.length === 0}
                    />
                  </th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Proyecto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === currentUser?.id}
                    isSelected={selectedIds.has(u.id)}
                    onToggleSelect={() => toggleSelect(u.id)}
                    onChanged={load}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isBulkConfirmOpen && (
          <ConfirmDialog
            title="Eliminar cuentas seleccionadas"
            message={`¿Eliminar ${selectedIds.size} cuenta(s)? Las que tengan proyectos, tareas o historial asociado no se podrán eliminar. Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            isConfirming={isBulkDeleting}
            onConfirm={handleBulkDelete}
            onCancel={() => setIsBulkConfirmOpen(false)}
          />
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
