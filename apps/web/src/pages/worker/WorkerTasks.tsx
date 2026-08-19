import type { TaskDTO, TaskStatus } from "@clearwork/shared";
import { TASK_STATUSES } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { fetchTasks, updateTaskStatus } from "../../api/tasks.js";
import { TASK_STATUS_LABEL } from "../../constants.js";

type StatusFilter = TaskStatus | "all";

export function WorkerTasks() {
  const [tasks, setTasks] = useState<TaskDTO[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchTasks(statusFilter === "all" ? {} : { status: statusFilter })
      .then(setTasks)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las tareas"));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(task: TaskDTO, status: TaskStatus) {
    setError(null);
    try {
      await updateTaskStatus(task.id, status);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado");
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Mis tareas</h2>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!tasks && !error && <p>Cargando…</p>}

      {tasks && (
        <div className="card">
          <div className="filter-bar">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">Todos los estados</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {tasks.length === 0 && (
            <p>No tienes tareas {statusFilter !== "all" ? "en ese estado." : "asignadas."}</p>
          )}

          {tasks.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Fecha límite</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        {t.title}
                        {t.description && (
                          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                            {t.description}
                          </div>
                        )}
                      </td>
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
                      <td>{t.dueDate ?? "—"}</td>
                      <td>
                        <Link to={`/worker/tasks/${t.id}`} className="link-button">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
