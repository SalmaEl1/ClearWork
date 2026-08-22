import type { ProjectDTO, ProjectMemberDTO, TaskDTO, TaskStatus } from "@clearwork/shared";
import { TASK_STATUSES } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import {
  createTask,
  deleteTask,
  fetchMyProjectMembers,
  fetchMyProjects,
  fetchTasks,
  updateTask,
  updateTaskStatus,
} from "../../api/tasks.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { Modal } from "../../components/Modal.js";
import { TASK_STATUS_LABEL } from "../../constants.js";

type TaskFormValues = {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
};

function TaskForm({
  members,
  initial,
  onSubmit,
  submitLabel,
}: {
  members: ProjectMemberDTO[];
  initial?: TaskFormValues;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ title, description, assigneeId, dueDate });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Título</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span>Descripción (opcional)</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          <span>Responsable</span>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Fecha límite (opcional)</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : submitLabel}
        </button>
      </form>
    </>
  );
}

export function SupervisorTasks() {
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tasks, setTasks] = useState<TaskDTO[] | null>(null);
  const [members, setMembers] = useState<ProjectMemberDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMyProjects()
      .then((list) => {
        setProjects(list);
        setSelectedProjectId((prev) => prev || (list[0]?.id ?? ""));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los proyectos"));
  }, []);

  const loadTasksAndMembers = useCallback(() => {
    if (!selectedProjectId) return;
    Promise.all([fetchTasks({ projectId: selectedProjectId }), fetchMyProjectMembers(selectedProjectId)])
      .then(([taskList, memberList]) => {
        setTasks(taskList);
        setMembers(memberList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las tareas"));
  }, [selectedProjectId]);

  useEffect(() => {
    loadTasksAndMembers();
  }, [loadTasksAndMembers]);

  const selectedProject = projects?.find((p) => p.id === selectedProjectId) ?? null;

  function memberName(id: string | null): string {
    if (!id) return "Sin asignar";
    return members.find((m) => m.userId === id)?.fullName ?? "—";
  }

  async function handleCreate(values: TaskFormValues) {
    await createTask({
      projectId: selectedProjectId,
      title: values.title,
      description: values.description || null,
      assigneeId: values.assigneeId || null,
      dueDate: values.dueDate || null,
    });
    setIsCreateOpen(false);
    loadTasksAndMembers();
  }

  async function handleEdit(values: TaskFormValues) {
    if (!editingTask) return;
    await updateTask(editingTask.id, {
      title: values.title,
      description: values.description || null,
      assigneeId: values.assigneeId || null,
      dueDate: values.dueDate || null,
    });
    setEditingTask(null);
    loadTasksAndMembers();
  }

  async function handleStatusChange(task: TaskDTO, status: TaskStatus) {
    setError(null);
    try {
      await updateTaskStatus(task.id, status);
      loadTasksAndMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado");
    }
  }

  async function handleDelete() {
    if (!deletingTask) return;
    setError(null);
    setIsDeleting(true);
    try {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
      loadTasksAndMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Tareas</h2>
        {selectedProject && !selectedProject.isArchived && (
          <button type="button" onClick={() => setIsCreateOpen(true)}>
            + Nueva tarea
          </button>
        )}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!projects && !error && <p>Cargando…</p>}
      {projects && projects.length === 0 && <p>Todavía no supervisas ningún proyecto.</p>}

      {projects && projects.length > 0 && (
        <div className="card">
          <label>
            <span>Proyecto</span>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isArchived ? " (archivado)" : ""}
                </option>
              ))}
            </select>
          </label>

          {!tasks && <p>Cargando tareas…</p>}
          {tasks && tasks.length === 0 && <p>Todavía no hay tareas en este proyecto.</p>}
          {tasks && tasks.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Avance</th>
                    <th>Responsable</th>
                    <th>Fecha límite</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td>{t.title}</td>
                      <td>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {TASK_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="progress-bar" style={{ width: "5rem" }}>
                          <div className="progress-bar__fill" style={{ width: `${t.progressPercentage}%` }} />
                        </div>
                        <span style={{ fontSize: "0.8rem" }}>{t.progressPercentage}%</span>
                      </td>
                      <td>{memberName(t.assigneeId)}</td>
                      <td>{t.dueDate ?? "—"}</td>
                      <td>
                        <div className="row-actions">
                          <Link to={`/supervisor/tasks/${t.id}`} className="link-button">
                            Ver
                          </Link>
                          <button type="button" className="secondary" onClick={() => setEditingTask(t)}>
                            Editar
                          </button>
                          <button type="button" className="secondary" onClick={() => setDeletingTask(t)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isCreateOpen && (
        <Modal title="Nueva tarea" onClose={() => setIsCreateOpen(false)}>
          <TaskForm members={members} onSubmit={handleCreate} submitLabel="Crear tarea" />
        </Modal>
      )}

      {editingTask && (
        <Modal title="Editar tarea" onClose={() => setEditingTask(null)}>
          <TaskForm
            members={members}
            initial={{
              title: editingTask.title,
              description: editingTask.description ?? "",
              assigneeId: editingTask.assigneeId ?? "",
              dueDate: editingTask.dueDate ?? "",
            }}
            onSubmit={handleEdit}
            submitLabel="Guardar cambios"
          />
        </Modal>
      )}

      {deletingTask && (
        <ConfirmDialog
          title="Eliminar tarea"
          message={`¿Eliminar "${deletingTask.title}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isConfirming={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTask(null)}
        />
      )}
    </div>
  );
}
