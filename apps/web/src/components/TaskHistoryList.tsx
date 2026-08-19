import type { TaskStatusHistoryEntryDTO } from "@clearwork/shared";
import { TASK_STATUS_LABEL } from "../constants.js";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compartido por la vista de detalle de tarea del trabajador y del
 * supervisor: mismo historial, misma forma de mostrarlo. */
export function TaskHistoryList({ history }: { history: TaskStatusHistoryEntryDTO[] }) {
  if (history.length === 0) {
    return <p>Todavía no ha cambiado de estado.</p>;
  }

  return (
    <ul className="activity-list">
      {history.map((h) => (
        <li key={h.id} className="activity-list__item">
          <span>
            <strong>{h.changedByName}</strong> la marcó como {TASK_STATUS_LABEL[h.toStatus]}
            {h.fromStatus && ` (antes ${TASK_STATUS_LABEL[h.fromStatus]})`}
          </span>
          <span className="activity-list__time">{formatDateTime(h.changedAt)}</span>
        </li>
      ))}
    </ul>
  );
}
