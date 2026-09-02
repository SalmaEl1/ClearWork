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
import { KanbanBoard } from "../../components/KanbanBoard.js";
import { Modal } from "../../components/Modal.js";
import { Pagination } from "../../components/Pagination.js";
import { TASK_STATUS_LABEL } from "../../constants.js";
import { todayDateString } from "../../lib/dates.js";
import { useStoredViewMode } from "../../lib/useStoredViewMode.js";

type TaskFormValues = {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  estimatedHours: string;
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
  const [estimatedHours, setEstimatedHours] = useState(initial?.estimatedHours ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sin min si la tarea ya tenía una fecha límite pasada: si no, el propio
  // <input> quedaría inválido con su valor actual y el navegador bloquearía
  // el envío del formulario aunque solo se quisiera cambiar otro campo.
  const dateMin = !initial?.dueDate || initial.dueDate >= todayDateString() ? todayDateString() : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    // Solo se exige "hoy o posterior" cuando la fecha límite cambia a un
    // valor nuevo; si no se toca, no bloquea la edición de una tarea que
    // ya venció por el simple paso del tiempo.
    if (dueDate && dueDate !== (initial?.dueDate ?? "") && dueDate < todayDateString()) {
      setError("La fecha límite no puede ser anterior a hoy");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ title, description, assigneeId, dueDate, estimatedHours });
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
          <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <input type="date" min={dateMin} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label>
          <span>Horas estimadas (opcional)</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : submitLabel}
        </button>
      </form>
    </>
  );
}

type StatusFilter = TaskStatus | "all";
type ViewMode = "list" | "board";
const VIEW_MODES: ViewMode[] = ["list", "board"];

const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: "Todas",
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Completada",
};

const DEFAULT_PAGE_SIZE = 10;
// Igual que en WorkerTasks: el tablero quiere las tres columnas
// completas del proyecto a la vez, no una página.
const BOARD_PAGE_SIZE = 500;

export function SupervisorTasks() {
  const [viewMode, setViewMode] = useStoredViewMode<ViewMode>(
    "clearwork:supervisor-tasks-view",
    VIEW_MODES,
    "list",
  );
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tasks, setTasks] = useState<TaskDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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

  useEffect(() => {
    setPage(1);
  }, [selectedProjectId, statusFilter]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const loadTasksAndMembers = useCallback(() => {
    if (!selectedProjectId) return;
    const filters =
      viewMode === "board"
        ? { projectId: selectedProjectId, page: 1, pageSize: BOARD_PAGE_SIZE }
        : {
            projectId: selectedProjectId,
            status: statusFilter === "all" ? undefined : statusFilter,
            page,
            pageSize,
          };
    Promise.all([fetchTasks(filters), fetchMyProjectMembers(selectedProjectId)])
      .then(([taskPage, memberList]) => {
        setTasks(taskPage.items);
        setTotal(taskPage.total);
        setMembers(memberList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las tareas"));
  }, [selectedProjectId, viewMode, statusFilter, page, pageSize]);

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
      estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
    });
    setIsCreateOpen(false);
    loadTasksAndMembers();
  }

  async function handleEdit(values: TaskFormValues) {
    if (!editingTask) return;
    // dueDate solo se manda si cambió: así se puede editar el resto de
    // campos de una tarea cuya fecha límite ya venció sin verse obligado
    // a moverla también (la API exige "hoy o posterior" para un valor
    // nuevo, no para uno que ya estaba guardado).
    const dueDateChanged = (values.dueDate || null) !== editingTask.dueDate;
    await updateTask(editingTask.id, {
      title: values.title,
      description: values.description || null,
      assigneeId: values.assigneeId || null,
      estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
      ...(dueDateChanged ? { dueDate: values.dueDate || null } : {}),
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
        <div className="row-actions">
          <button
            type="button"
            className={viewMode === "list" ? undefined : "secondary"}
            onClick={() => setViewMode("list")}
          >
            Lista
          </button>
          <button
            type="button"
            className={viewMode === "board" ? undefined : "secondary"}
            onClick={() => setViewMode("board")}
          >
            Tablero
          </button>
          {selectedProject && !selectedProject.isArchived && (
            <button type="button" onClick={() => setIsCreateOpen(true)}>
              + Nueva tarea
            </button>
          )}
        </div>
      </div>

      {viewMode === "list" && (
        <div className="filter-bar">
          {(["all", ...TASK_STATUSES] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              className={s === statusFilter ? undefined : "secondary"}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_FILTER_LABEL[s]}
            </button>
          ))}
        </div>
      )}

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

          {tasks && viewMode === "board" && (
            <div className="table-scroll">
              <KanbanBoard
                tasks={tasks}
                taskLink={(t) => `/supervisor/tasks/${t.id}`}
                assigneeName={memberName}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}

          {tasks && viewMode === "list" && tasks.length === 0 && (
            <p>
              {statusFilter === "all"
                ? "Todavía no hay tareas en este proyecto."
                : "No hay tareas en ese estado."}
            </p>
          )}
          {tasks && viewMode === "list" && tasks.length > 0 && (
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

          {viewMode === "list" && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
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
              estimatedHours: editingTask.estimatedHours?.toString() ?? "",
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
