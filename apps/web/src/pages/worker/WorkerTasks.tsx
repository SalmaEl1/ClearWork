import type { TaskDTO, TaskStatus } from "@clearwork/shared";
import { TASK_STATUSES } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { fetchTasks, updateTaskStatus } from "../../api/tasks.js";
import { KanbanBoard } from "../../components/KanbanBoard.js";
import { Pagination } from "../../components/Pagination.js";
import { TASK_STATUS_LABEL } from "../../constants.js";

type StatusFilter = TaskStatus | "all";
type ViewMode = "list" | "board";

const DEFAULT_PAGE_SIZE = 10;
// El tablero quiere ver las tres columnas completas a la vez, no una
// página: pedir "todo" de una tacada es más simple que paginar cada
// columna por separado, y en la práctica el volumen de tareas de una
// sola persona no se acerca a este límite.
const BOARD_PAGE_SIZE = 500;

export function WorkerTasks() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tasks, setTasks] = useState<TaskDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const load = useCallback(() => {
    const query =
      viewMode === "board"
        ? { page: 1, pageSize: BOARD_PAGE_SIZE }
        : { status: statusFilter === "all" ? undefined : statusFilter, page, pageSize };
    fetchTasks(query)
      .then((result) => {
        setTasks(result.items);
        setTotal(result.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las tareas"));
  }, [viewMode, statusFilter, page, pageSize]);

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
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!tasks && !error && <p>Cargando…</p>}

      {tasks && viewMode === "board" && (
        <div className="table-scroll">
          <KanbanBoard
            tasks={tasks}
            taskLink={(t) => `/worker/tasks/${t.id}`}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {tasks && viewMode === "list" && (
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
                    <th>Avance</th>
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
                      <td>
                        <div className="progress-bar" style={{ width: "5rem" }}>
                          <div className="progress-bar__fill" style={{ width: `${t.progressPercentage}%` }} />
                        </div>
                        <span style={{ fontSize: "0.8rem" }}>{t.progressPercentage}%</span>
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

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
