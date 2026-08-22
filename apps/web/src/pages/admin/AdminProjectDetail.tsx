import type { AdminUserSummary, ProjectDetailDTO, TaskDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import {
  assignProjectMember,
  deleteAdminProject,
  fetchAdminProject,
  fetchAdminProjectTasks,
  fetchAllAdminUsers,
  removeProjectMember,
  updateAdminProject,
} from "../../api/admin.js";
import { BackLink } from "../../components/BackLink.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { ProjectMembersCard } from "../../components/ProjectMembersCard.js";
import { TASK_STATUS_LABEL, TASK_STATUS_PILL_CLASS } from "../../constants.js";

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

/**
 * Solo lectura: gestionar tareas (crearlas, reasignarlas, borrarlas) sigue
 * siendo cosa del supervisor. El admin las necesita ver para saber en qué
 * punto está el proyecto, no para tocarlas.
 */
function TasksCard({ project, tasks }: { project: ProjectDetailDTO; tasks: TaskDTO[] | null }) {
  const memberName = (userId: string) =>
    project.members.find((m) => m.userId === userId)?.fullName ?? "Sin asignar";

  const counts = {
    pending: tasks?.filter((t) => t.status === "pending").length ?? 0,
    in_progress: tasks?.filter((t) => t.status === "in_progress").length ?? 0,
    done: tasks?.filter((t) => t.status === "done").length ?? 0,
  };

  return (
    <div className="card">
      <h3>Tareas ({tasks?.length ?? 0})</h3>
      {!tasks && <p>Cargando…</p>}

      {tasks && tasks.length === 0 && <p>Todavía no hay tareas en este proyecto.</p>}

      {tasks && tasks.length > 0 && (
        <>
          <p style={{ fontSize: "0.85rem" }}>
            {counts.pending} pendiente(s) · {counts.in_progress} en curso · {counts.done} hecha(s)
          </p>
          <ul className="team-list">
            {tasks.map((t) => (
              <li key={t.id} className="team-list__item">
                <span className="team-list__name">{t.title}</span>
                <span className="team-list__hours">{t.assigneeId ? memberName(t.assigneeId) : "Sin asignar"}</span>
                <span className={`status-pill ${TASK_STATUS_PILL_CLASS[t.status]}`}>
                  {TASK_STATUS_LABEL[t.status]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function DeleteProjectCard({
  project,
  taskCount,
}: {
  project: ProjectDetailDTO;
  taskCount: number | null;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAdminProject(project.id);
      navigate("/admin/projects", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  }

  const memberCount = project.members.length;
  const impact =
    taskCount === null
      ? "sus tareas y la membresía de su equipo"
      : `${taskCount} tarea(s) y la membresía de ${memberCount} persona(s)`;

  return (
    <div className="card">
      <h3>Eliminar proyecto</h3>
      <p>Borra el proyecto, sus tareas y la membresía de su equipo. No se puede deshacer.</p>
      {error && <div className="error-banner">{error}</div>}
      <button type="button" className="secondary" disabled={isDeleting} onClick={() => setIsConfirmOpen(true)}>
        {isDeleting ? "Eliminando…" : "Eliminar proyecto"}
      </button>
      {isConfirmOpen && (
        <ConfirmDialog
          title="Eliminar proyecto"
          message={`¿Eliminar "${project.name}"? Se borrarán también ${impact}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isConfirming={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}
    </div>
  );
}

export function AdminProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailDTO | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([fetchAdminProject(id), fetchAllAdminUsers(), fetchAdminProjectTasks(id)])
      .then(([projectDetail, userList, taskList]) => {
        setProject(projectDetail);
        setUsers(userList);
        setTasks(taskList);
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
        <BackLink to="/admin/projects">Volver a proyectos</BackLink>
      </div>
      <h2>{project?.name ?? "Proyecto"}</h2>
      {error && <div className="error-banner">{error}</div>}
      {!project && !error && <p>Cargando…</p>}

      {project && (
        <>
          <div className="dashboard-grid__row">
            <EditProjectForm project={project} supervisors={supervisors} onSaved={load} />
            <ProjectMembersCard
              project={project}
              workers={workers}
              onAssign={(userId) => assignProjectMember(project.id, { userId })}
              onRemove={(userId) => removeProjectMember(project.id, userId)}
              onChanged={load}
            />
          </div>
          <TasksCard project={project} tasks={tasks} />
          <DeleteProjectCard project={project} taskCount={tasks?.length ?? null} />
        </>
      )}
    </div>
  );
}
