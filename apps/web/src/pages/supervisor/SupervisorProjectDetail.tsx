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
import { ProjectMembersCard } from "../../components/ProjectMembersCard.js";
import { useSavedConfirmation } from "../../lib/useSavedConfirmation.js";

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
  const [isSaved, triggerSaved] = useSavedConfirmation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateMyProject(project.id, { name, description: description || null });
      triggerSaved();
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
      {/* De solo lectura a propósito: el cliente lo da de alta o lo edita
          solo el admin (ver updateMyProjectSchema, api/projects/schemas.ts). */}
      <p className="project-client-info">
        Cliente: {project.clientName} · Contacto: {project.clientContact}
      </p>
      {error && <div className="error-banner">{error}</div>}
      {isSaved && <div className="alert-banner status-ok">Cambios guardados.</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Nombre</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span>Descripción</span>
          <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar cambios"}
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
      <h2>{project?.name ?? "Proyecto"}</h2>
      {error && <div className="error-banner">{error}</div>}
      {!project && !error && <p>Cargando…</p>}

      {project && (
        <div className="dashboard-grid__row">
          <EditProjectForm project={project} onSaved={load} />
          <ProjectMembersCard
            project={project}
            workers={workers}
            onAssign={(userId) => assignMemberToMyProject(project.id, { userId })}
            onRemove={(userId) => removeMemberFromMyProject(project.id, userId)}
            onChanged={load}
          />
        </div>
      )}
    </div>
  );
}
