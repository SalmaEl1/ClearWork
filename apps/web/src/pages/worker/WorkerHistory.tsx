import type { BreakDTO, WorkSessionDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchWorkSessionHistory } from "../../api/workSessions.js";
import { BREAK_TYPE_LABEL } from "../../constants.js";

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

function SessionRow({ session }: { session: WorkSessionDTO }) {
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

export function WorkerHistory() {
  const [sessions, setSessions] = useState<WorkSessionDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkSessionHistory()
      .then(setSessions)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el historial"));
  }, []);

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Historial de fichajes</h2>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!sessions && !error && <p>Cargando…</p>}

      {sessions && (
        <div className="card">
          {sessions.length === 0 && <p>Todavía no tienes jornadas fichadas.</p>}

          {sessions.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Horas trabajadas</th>
                    <th>Pausas</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <SessionRow key={s.id} session={s} />
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
