import type { BreakType, WorkSessionDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { ApiError } from "../api/client.js";
import {
  clockIn,
  clockOut,
  endBreak,
  fetchActiveSession,
  startBreak,
} from "../api/workSessions.js";

const BREAK_LABEL: Record<BreakType, string> = {
  lunch: "Pausa para comer",
  ergonomic: "Pausa ergonómica",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ClockWidget({ onSessionChange }: { onSessionChange?: () => void }) {
  const [session, setSession] = useState<WorkSessionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSession()
      .then((res) => setSession(res.activeSession))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar tu jornada"))
      .finally(() => setIsLoading(false));
  }, []);

  async function run(action: () => Promise<WorkSessionDTO>, clearsSession = false) {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await action();
      setSession(clearsSession ? null : result);
      onSessionChange?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <p>Cargando tu jornada…</p>
      </div>
    );
  }

  const openBreak = session?.breaks.find((b) => b.endedAt === null) ?? null;

  return (
    <div className="card">
      <h3>Tu jornada</h3>
      {error && <div className="error-banner">{error}</div>}

      {!session && (
        <>
          <p>No has fichado entrada todavía.</p>
          <button type="button" disabled={isSubmitting} onClick={() => run(clockIn)}>
            Fichar entrada
          </button>
        </>
      )}

      {session && !openBreak && (
        <>
          <p>
            Trabajando desde las <strong>{formatTime(session.startedAt)}</strong>.
          </p>
          <div className="clock-actions">
            <button
              type="button"
              className="secondary"
              disabled={isSubmitting}
              onClick={() => run(() => startBreak("lunch"))}
            >
              {BREAK_LABEL.lunch}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={isSubmitting}
              onClick={() => run(() => startBreak("ergonomic"))}
            >
              {BREAK_LABEL.ergonomic}
            </button>
            <button type="button" disabled={isSubmitting} onClick={() => run(clockOut, true)}>
              Fichar salida
            </button>
          </div>
        </>
      )}

      {session && openBreak && (
        <>
          <p>
            En {BREAK_LABEL[openBreak.type].toLowerCase()} desde las{" "}
            <strong>{formatTime(openBreak.startedAt)}</strong>.
          </p>
          <button type="button" disabled={isSubmitting} onClick={() => run(endBreak)}>
            Terminar pausa
          </button>
        </>
      )}
    </div>
  );
}
