import type { ProjectDetailDTO, SupervisorWorkerOptionDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import {
  assignMemberToMyProject,
  fetchMyProject,
  fetchWorkersForAssignment,
  removeMemberFromMyProject,
  updateMyProject,
} from "../../api/supervisorProjects.js";
import { BackLink } from "../../components/BackLink.js";

/** Sin supervisorId ni isArchived: eso sigue siendo exclusivo del admin
 * (ver apps/api/src/modules/projects/schemas.ts's updateMyProjectSchema). */
function EditProjectForm({
  project,
  onSaved,
}: {
  project: ProjectDetailDTO;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateMyProject(project.id, { name, description: description || null });
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
  workers: SupervisorWorkerOptionDTO[];
  onChanged: () => void;
}) {
  const memberIds = new Set(project.members.map((m) => m.userId));
  const available = workers.filter((w) => !memberIds.has(w.id));
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await assignMemberToMyProject(project.id, { userId: selectedWorkerId });
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
      await removeMemberFromMyProject(project.id, userId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar");
    }
  }

  return (
    <div className="card">
      <h3>Miembros ({project.members.length})</h3>
      {error && <div className="error-banner">{error}</div>}

      {project.members.length === 0 && <p>Todavía no hay trabajadores en este proyecto.</p>}
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
          {available.length === 0 && <option value="">No hay trabajadores disponibles</option>}
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

export function SupervisorProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailDTO | null>(null);
  const [workers, setWorkers] = useState<SupervisorWorkerOptionDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([fetchMyProject(id), fetchWorkersForAssignment()])
      .then(([projectDetail, workerList]) => {
        setProject(projectDetail);
        setWorkers(workerList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el proyecto"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!id) return null;

  return (
    <div className="dashboard-grid">
      <div>
        <BackLink to="/supervisor/projects">Volver a mis proyectos</BackLink>
      </div>
      <h2>{project?.name ?? "Proyecto"}</h2>
      {error && <div className="error-banner">{error}</div>}
      {!project && !error && <p>Cargando…</p>}

      {project && (
        <div className="dashboard-grid__row">
          <EditProjectForm project={project} onSaved={load} />
          <MembersCard project={project} workers={workers} onChanged={load} />
        </div>
      )}
    </div>
  );
}
