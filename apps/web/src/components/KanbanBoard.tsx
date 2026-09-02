import type { TaskDTO, TaskStatus } from "@clearwork/shared";
import { TASK_STATUSES } from "@clearwork/shared";
import { useState } from "react";
import type { DragEvent } from "react";
import { Link } from "react-router-dom";
import { TASK_STATUS_LABEL } from "../constants.js";

/**
 * Tablero kanban de las tareas de un proyecto (issue #115), para
 * trabajador y supervisor por igual: tres columnas fijas, una por
 * estado, con las tareas agrupadas dentro de cada una. Mover una tarjeta
 * de columna es el mismo cambio de estado que ya ofrecía la vista de
 * lista (updateTaskStatus) — se puede arrastrar la tarjeta a otra
 * columna, con la API nativa de arrastrar y soltar del navegador (sin
 * librería: no hay ninguna otra interacción de este tipo en la app, y
 * la nativa ya cubre el caso). El desplegable de cada tarjeta se
 * conserva como alternativa: arrastrar no funciona por teclado ni en la
 * mayoría de móviles, y sin él esas personas no podrían mover nada.
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
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  function handleDragStart(event: DragEvent<HTMLDivElement>, task: TaskDTO) {
    event.dataTransfer.setData("text/plain", task.id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(task.id);
  }

  function handleDragEnd() {
    setDraggingTaskId(null);
    setDragOverStatus(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, status: TaskStatus) {
    event.preventDefault();
    setDragOverStatus(null);
    const taskId = event.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) {
      onStatusChange(task, status);
    }
  }

  return (
    <div className="kanban-board">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className={`kanban-column ${dragOverStatus === status ? "kanban-column--drop-target" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((current) => (current === status ? null : current))}
            onDrop={(e) => handleDrop(e, status)}
          >
            <h3 className="kanban-column__title">
              {TASK_STATUS_LABEL[status]} ({columnTasks.length})
            </h3>

            {columnTasks.length === 0 && <p className="kanban-column__empty">Sin tareas</p>}

            {columnTasks.map((task) => (
              <div
                key={task.id}
                className={`kanban-card ${draggingTaskId === task.id ? "kanban-card--dragging" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
              >
                <Link to={taskLink(task)} className="kanban-card__title" draggable={false}>
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
