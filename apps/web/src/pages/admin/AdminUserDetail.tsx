import type { AdminUserSummary, LeaveDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.js";
import { ApiError } from "../../api/client.js";
import { deleteAdminUser, fetchAdminUser, updateAdminUser } from "../../api/admin.js";
import { deleteLeave, fetchLeaves } from "../../api/leaves.js";
import { Avatar } from "../../components/Avatar.js";
import { BackLink } from "../../components/BackLink.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { Modal } from "../../components/Modal.js";
import { RegisterLeaveForm } from "../../components/RegisterLeaveForm.js";
import { LEAVE_TYPE_LABEL, ROLE_LABEL } from "../../constants.js";

function UserHeaderCard({ user, isSelf }: { user: AdminUserSummary; isSelf: boolean }) {
  return (
    <div className="card user-header">
      <Avatar fullName={user.fullName} size="md" />
      <div>
        <h2 className="user-header__name">
          {user.fullName}
          {isSelf && " (tú)"}
        </h2>
        <div className="user-header__meta">
          <span className="role-badge">{ROLE_LABEL[user.role]}</span>
          <span className={`status-pill ${user.isActive ? "status-ok" : "status-neutral"}`}>
            {user.isActive ? "Activa" : "Desactivada"}
          </span>
        </div>
      </div>
    </div>
  );
}

function EditUserForm({
  user,
  isSelf,
  onSaved,
}: {
  user: AdminUserSummary;
  isSelf: boolean;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
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
        email,
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
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
            disabled={isSelf}
            title={isSelf ? "No puedes desactivar tu propia cuenta" : undefined}
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

function ProjectInfoCard({ user }: { user: AdminUserSummary }) {
  if (user.role === "worker") {
    return (
      <div className="card">
        <h3>Proyecto</h3>
        {user.currentProjectId ? (
          <p>
            Actualmente en{" "}
            <Link to={`/admin/projects/${user.currentProjectId}`}>{user.currentProjectName}</Link>
            . Para cambiarlo de proyecto, gestiona la membresía desde la ficha del proyecto.
          </p>
        ) : (
          <p>No está asignado a ningún proyecto.</p>
        )}
      </div>
    );
  }

  if (user.role === "supervisor") {
    return (
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
    );
  }

  return null;
}

function LeavesCard({ userId }: { userId: string }) {
  const [leaves, setLeaves] = useState<LeaveDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const load = useCallback(() => {
    fetchLeaves(userId)
      .then(setLeaves)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las bajas"));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(leaveId: string) {
    setError(null);
    try {
      await deleteLeave(leaveId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <div className="card">
      <h3>Bajas y ausencias</h3>
      {error && <div className="error-banner">{error}</div>}
      {!leaves && <p>Cargando…</p>}
      {leaves && leaves.length === 0 && <p>No hay bajas ni ausencias registradas.</p>}
      {leaves && leaves.length > 0 && (
        <ul className="team-list">
          {leaves.map((l) => (
            <li key={l.id} className="team-list__item">
              <span className="team-list__name">{LEAVE_TYPE_LABEL[l.type]}</span>
              <span className="team-list__hours">
                {l.startDate} – {l.endDate ?? "en curso"}
              </span>
              <button type="button" className="secondary" onClick={() => handleDelete(l.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" style={{ marginTop: "1rem" }} onClick={() => setIsRegistering(true)}>
        Registrar baja
      </button>

      {isRegistering && (
        <Modal title="Registrar baja" onClose={() => setIsRegistering(false)}>
          <RegisterLeaveForm
            userId={userId}
            onSaved={() => {
              setIsRegistering(false);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function DeleteUserCard({ user, isSelf }: { user: AdminUserSummary; isSelf: boolean }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAdminUser(user.id);
      navigate("/admin/users", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  }

  return (
    <div className="card">
      <h3>Eliminar cuenta</h3>
      {isSelf ? (
        <p>No puedes eliminar tu propia cuenta de administrador.</p>
      ) : (
        <p>
          Si esta cuenta tiene proyectos, tareas o historial asociado, no se podrá eliminar hasta
          reasignar o quitar esos datos primero.
        </p>
      )}
      {error && <div className="error-banner">{error}</div>}
      <button
        type="button"
        className="secondary"
        disabled={isDeleting || isSelf}
        onClick={() => setIsConfirmOpen(true)}
      >
        {isDeleting ? "Eliminando…" : "Eliminar cuenta"}
      </button>
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
    </div>
  );
}

export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
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

  const isSelf = id === currentUser?.id;

  return (
    <div className="dashboard-grid">
      <div>
        <BackLink to="/admin/users">Volver a usuarios</BackLink>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!user && !error && <p>Cargando…</p>}

      {user && (
        <>
          <UserHeaderCard user={user} isSelf={isSelf} />
          {user.role !== "admin" && <ProjectInfoCard user={user} />}

          <div className="dashboard-grid__row">
            <EditUserForm user={user} isSelf={isSelf} onSaved={load} />
            <DeleteUserCard user={user} isSelf={isSelf} />
          </div>

          {user.role !== "admin" && <LeavesCard userId={user.id} />}
        </>
      )}
    </div>
  );
}
