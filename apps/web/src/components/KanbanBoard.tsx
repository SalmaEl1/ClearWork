import type { TaskDTO, TaskStatus } from "@clearwork/shared";
import { TASK_STATUSES } from "@clearwork/shared";
import { Link } from "react-router-dom";
import { TASK_STATUS_LABEL } from "../constants.js";

/**
 * Tablero kanban de las tareas de un proyecto (issue #115), para
 * trabajador y supervisor por igual: tres columnas fijas, una por
 * estado, con las tareas agrupadas dentro de cada una. Mover una tarjeta
 * de columna es el mismo cambio de estado que ya ofrecía la vista de
 * lista (updateTaskStatus), aquí como un desplegable en la propia
 * tarjeta — no hay arrastrar y soltar: esta app no tiene ninguna otra
 * interacción de ese tipo, y añadir una librería solo para esto no
 * compensa frente a un control ya conocido en el resto del panel.
 */
export function KanbanBoard({
  tasks,
  taskLink,
  assigneeName,
  onStatusChange,
}: {
  tasks: TaskDTO[];
  taskLink: (task: TaskDTO) => string;
  /** Ausente en la vista del trabajador: sus tarjetas no necesitan decir
   * quién es el responsable, siempre es él mismo. */
  assigneeName?: (assigneeId: string | null) => string;
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
}) {
  return (
    <div className="kanban-board">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="kanban-column">
            <h3 className="kanban-column__title">
              {TASK_STATUS_LABEL[status]} ({columnTasks.length})
            </h3>

            {columnTasks.length === 0 && <p className="kanban-column__empty">Sin tareas</p>}

            {columnTasks.map((task) => (
              <div key={task.id} className="kanban-card">
                <Link to={taskLink(task)} className="kanban-card__title">
                  {task.title}
                </Link>
                {assigneeName && <p className="kanban-card__meta">{assigneeName(task.assigneeId)}</p>}
                <p className="kanban-card__meta">Fecha límite: {task.dueDate ?? "sin fecha límite"}</p>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${task.progressPercentage}%` }} />
                </div>
                <select
                  className="kanban-card__status"
                  aria-label={`Estado de ${task.title}`}
                  value={task.status}
                  onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
