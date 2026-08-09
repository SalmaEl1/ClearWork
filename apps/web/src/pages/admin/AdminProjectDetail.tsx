import type { AdminUserSummary, ProjectDetailDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import {
  assignProjectMember,
  deleteAdminProject,
  fetchAdminProject,
  fetchAdminUsers,
  removeProjectMember,
  updateAdminProject,
} from "../../api/admin.js";

function EditProjectForm({
  project,
  supervisors,
  onSaved,
}: {
  project: ProjectDetailDTO;
  supervisors: AdminUserSummary[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [supervisorId, setSupervisorId] = useState(project.supervisorId);
  const [isArchived, setIsArchived] = useState(project.isArchived);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateAdminProject(project.id, {
        name,
        description: description || null,
        supervisorId,
        isArchived,
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
      <h3>Datos del proyecto</h3>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Nombre</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span>Descripción</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          <span>Supervisor/a</span>
          <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={isArchived}
            onChange={(e) => setIsArchived(e.target.checked)}
          />
          <span style={{ margin: 0 }}>Archivado</span>
        </label>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

function MembersCard({
  project,
  workers,
  onChanged,
}: {
  project: ProjectDetailDTO;
  workers: AdminUserSummary[];
  onChanged: () => void;
}) {
  const memberIds = new Set(project.members.map((m) => m.userId));
  const available = workers.filter((w) => !memberIds.has(w.id));
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si la selección actual ya no está disponible (recién asignada, o la
  // lista todavía no había cargado cuando se montó el componente), se
  // recoloca sobre el primer disponible en vez de quedarse congelada.
  const availableIdsKey = available.map((w) => w.id).join(",");
  useEffect(() => {
    if (!available.some((w) => w.id === selectedWorkerId)) {
      setSelectedWorkerId(available[0]?.id ?? "");
    }
  }, [availableIdsKey]);

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    if (!selectedWorkerId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await assignProjectMember(project.id, { userId: selectedWorkerId });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asignar");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    try {
      await removeProjectMember(project.id, userId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar");
    }
  }

  return (
    <div className="card">
      <h3>Miembros ({project.members.length})</h3>
      {error && <div className="error-banner">{error}</div>}

      {project.members.length === 0 && <p>Todavía no hay teletrabajadores en este proyecto.</p>}
      {project.members.length > 0 && (
        <ul className="team-list">
          {project.members.map((m) => (
            <li key={m.userId} className="team-list__item">
              <span className="team-list__name">{m.fullName}</span>
              <button type="button" className="secondary" onClick={() => handleRemove(m.userId)}>
                Quitar del proyecto
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAssign} style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <select
          value={selectedWorkerId}
          onChange={(e) => setSelectedWorkerId(e.target.value)}
          style={{ flex: 1 }}
        >
          {available.length === 0 && <option value="">No hay teletrabajadores disponibles</option>}
          {available.map((w) => (
            <option key={w.id} value={w.id}>
              {w.fullName} {w.currentProjectName ? `(en ${w.currentProjectName})` : "(sin proyecto)"}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isSubmitting || !selectedWorkerId}>
          Asignar
        </button>
      </form>
    </div>
  );
}

function DeleteProjectCard({ project }: { project: ProjectDetailDTO }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `¿Eliminar "${project.name}"? Se borrarán también sus tareas y la membresía de su equipo. Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAdminProject(project.id);
      navigate("/admin/projects", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
      setIsDeleting(false);
    }
  }

  return (
    <div className="card">
      <h3>Eliminar proyecto</h3>
      <p>Borra el proyecto, sus tareas y la membresía de su equipo. No se puede deshacer.</p>
      {error && <div className="error-banner">{error}</div>}
      <button type="button" className="secondary" disabled={isDeleting} onClick={handleDelete}>
        {isDeleting ? "Eliminando…" : "Eliminar proyecto"}
      </button>
    </div>
  );
}

export function AdminProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailDTO | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([fetchAdminProject(id), fetchAdminUsers()])
      .then(([projectDetail, userList]) => {
        setProject(projectDetail);
        setUsers(userList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el proyecto"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!id) return null;

  const supervisors = users.filter((u) => u.role === "supervisor");
  const workers = users.filter((u) => u.role === "worker");

  return (
    <div className="dashboard-grid">
      <div>
        <Link to="/admin/projects">← Volver a proyectos</Link>
      </div>
      <h2>{project?.name ?? "Proyecto"}</h2>
      {error && <div className="error-banner">{error}</div>}

      {project && (
        <>
          <div className="dashboard-grid__row">
            <EditProjectForm project={project} supervisors={supervisors} onSaved={load} />
            <MembersCard project={project} workers={workers} onChanged={load} />
          </div>
          <DeleteProjectCard project={project} />
        </>
      )}
    </div>
  );
}
