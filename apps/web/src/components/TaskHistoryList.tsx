import type { TaskHistoryEntryDTO } from "@clearwork/shared";
import { TASK_STATUS_LABEL } from "../constants.js";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function historyMessage(entry: TaskHistoryEntryDTO): string {
  switch (entry.kind) {
    case "created":
      return `${entry.changedByName} creó la tarea`;
    case "status":
      return `${entry.changedByName} la marcó como ${TASK_STATUS_LABEL[entry.toStatus]}${
        entry.fromStatus ? ` (antes ${TASK_STATUS_LABEL[entry.fromStatus]})` : ""
      }`;
    case "progress":
      return `${entry.changedByName} actualizó el avance al ${entry.toProgressPercentage}% (antes ${entry.fromProgressPercentage}%)`;
  }
}

/** Compartido por la vista de detalle de tarea del trabajador y del
 * supervisor: mismo historial, misma forma de mostrarlo. Issue #108: la
 * creación siempre es el primer punto, y los cambios de avance se ven
 * junto a los de estado, no en una lista aparte. */
export function TaskHistoryList({ history }: { history: TaskHistoryEntryDTO[] }) {
  if (history.length === 0) {
    return <p>Todavía no ha cambiado de estado.</p>;
  }

  return (
    <ul className="activity-list">
      {history.map((entry) => (
        <li key={entry.kind === "created" ? "created" : entry.id} className="activity-list__item">
          <span>{historyMessage(entry)}</span>
          <span className="activity-list__time">{formatDateTime(entry.changedAt)}</span>
        </li>
      ))}
    </ul>
  );
}
