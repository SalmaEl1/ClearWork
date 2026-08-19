import type { ProjectMemberDTO, TaskDetailDTO, TaskStatus } from "@clearwork/shared";
import { TASK_STATUSES } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { fetchMyProjectMembers, fetchTask, updateTaskStatus } from "../../api/tasks.js";
import { BackLink } from "../../components/BackLink.js";
import { TaskHistoryList } from "../../components/TaskHistoryList.js";
import { TASK_STATUS_LABEL } from "../../constants.js";

export function SupervisorTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetailDTO | null>(null);
  const [members, setMembers] = useState<ProjectMemberDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    fetchTask(id)
      .then((t) => {
        setTask(t);
        return fetchMyProjectMembers(t.projectId);
      })
      .then(setMembers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la tarea"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(status: TaskStatus) {
    if (!task) return;
    setError(null);
    try {
      await updateTaskStatus(task.id, status);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado");
    }
  }

  if (!id) return null;

  const assigneeName = task?.assigneeId
    ? (members.find((m) => m.userId === task.assigneeId)?.fullName ?? "—")
    : "Sin asignar";

  return (
    <div className="dashboard-grid">
      <div>
        <BackLink to="/supervisor/tasks">Volver a tareas</BackLink>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!task && !error && <p>Cargando…</p>}

      {task && (
        <>
          <div className="card">
            <h2>{task.title}</h2>
            {task.description && <p>{task.description}</p>}
            <label>
              <span>Estado</span>
              <select value={task.status} onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <p>Responsable: {assigneeName}</p>
            <p style={{ marginBottom: 0 }}>Fecha límite: {task.dueDate ?? "sin fecha límite"}</p>
          </div>

          <div className="card">
            <h3>Historial</h3>
            <TaskHistoryList history={task.statusHistory} />
          </div>
        </>
      )}
    </div>
  );
}
