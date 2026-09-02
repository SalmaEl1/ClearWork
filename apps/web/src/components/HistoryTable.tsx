import type { BreakDTO } from "@clearwork/shared";
import { BREAK_TYPE_LABEL } from "../constants.js";
import type { HistoryEntry } from "../lib/historyEntries.js";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
}

function formatBreak(b: BreakDTO): string {
  if (!b.endedAt) return `${BREAK_TYPE_LABEL[b.type]} (en curso)`;
  const minutes = Math.round((new Date(b.endedAt).getTime() - new Date(b.startedAt).getTime()) / 60_000);
  return `${BREAK_TYPE_LABEL[b.type]} (${formatDuration(minutes)})`;
}

/** Una fila por entrada del historial: un fichaje normal, o un periodo
 * (baja, vacación, ausencia puntual) que explica por qué esos días no
 * tienen ficheje asociado (issue #101). Las fechas de estos últimos son
 * cadenas "AAAA-MM-DD" simples, así que se muestran tal cual — igual que
 * en el resto de la app (ver WorkerVacationsHistory) — en vez de pasarlas
 * por Date, que podría desplazarlas un día según el huso horario. */
function HistoryRow({ entry }: { entry: HistoryEntry }) {
  if (entry.kind === "session") {
    const { session } = entry;
    return (
      <tr>
        <td>{formatDate(session.startedAt)}</td>
        <td>{formatTime(session.startedAt)}</td>
        <td>{session.endedAt ? formatTime(session.endedAt) : "En curso"}</td>
        <td>{formatDuration(session.workedMinutes)}</td>
        <td>{session.breaks.length === 0 ? "—" : session.breaks.map(formatBreak).join(", ")}</td>
      </tr>
    );
  }

  if (entry.kind === "leave") {
    return (
      <tr className="history-row--period">
        <td>
          {entry.startDate} – {entry.endDate ?? "en curso"}
        </td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
        <td>{entry.label}</td>
      </tr>
    );
  }

  if (entry.kind === "vacation") {
    return (
      <tr className="history-row--period">
        <td>
          {entry.startDate} – {entry.endDate}
        </td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
        <td>Vacaciones</td>
      </tr>
    );
  }

  return (
    <tr className="history-row--period">
      <td>{entry.date}</td>
      <td>{entry.startTime}</td>
      <td>{entry.endTime}</td>
      <td>—</td>
      <td>Ausencia puntual ({entry.reason})</td>
    </tr>
  );
}

export function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return <p>Todavía no hay nada que mostrar.</p>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Horas trabajadas</th>
            <th>Pausas / detalle</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <HistoryRow key={`${entry.kind}-${entry.id}`} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
