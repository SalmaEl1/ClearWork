import type { TaskDTO, WorkSessionDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { ApiError } from "../api/client.js";
import { fetchTasks } from "../api/tasks.js";
import {
  clockIn,
  clockOut,
  endBreak,
  fetchActiveSession,
  startBreak,
  switchTask,
} from "../api/workSessions.js";
import { BREAK_TYPE_LABEL } from "../constants.js";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Selector de tarea + descripción, reutilizado al fichar entrada y al
 * cambiar de tarea a mitad de jornada: en ambos casos es "en qué estoy
 * trabajando a partir de ahora". */
function TaskSegmentFields({
  tasks,
  taskId,
  onTaskIdChange,
  description,
  onDescriptionChange,
}: {
  tasks: TaskDTO[];
  taskId: string;
  onTaskIdChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <>
      <label>
        <span>Tarea (opcional)</span>
        <select value={taskId} onChange={(e) => onTaskIdChange(e.target.value)}>
          <option value="">Sin tarea concreta</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>¿Qué vas a hacer? (opcional)</span>
        <input
          placeholder="Breve descripción"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </label>
    </>
  );
}

export function ClockWidget({ onSessionChange }: { onSessionChange?: () => void }) {
  const [session, setSession] = useState<WorkSessionDTO | null>(null);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clockInTaskId, setClockInTaskId] = useState("");
  const [clockInDescription, setClockInDescription] = useState("");

  const [isSwitchingTask, setIsSwitchingTask] = useState(false);
  const [switchTaskId, setSwitchTaskId] = useState("");
  const [switchDescription, setSwitchDescription] = useState("");

  useEffect(() => {
    Promise.all([fetchActiveSession(), fetchTasks()])
      .then(([res, taskList]) => {
        setSession(res.activeSession);
        setTasks(taskList.filter((t) => t.status !== "done"));
      })
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

  async function handleClockIn() {
    await run(() => clockIn({ taskId: clockInTaskId || null, description: clockInDescription || null }));
    setClockInTaskId("");
    setClockInDescription("");
  }

  async function handleSwitchTask() {
    await run(() => switchTask({ taskId: switchTaskId || null, description: switchDescription || null }));
    setIsSwitchingTask(false);
    setSwitchTaskId("");
    setSwitchDescription("");
  }

  if (isLoading) {
    return (
      <div className="card">
        <p>Cargando tu jornada…</p>
      </div>
    );
  }

  const openBreak = session?.breaks.find((b) => b.endedAt === null) ?? null;
  const activeSegment = session?.taskSegments.find((s) => s.endedAt === null) ?? null;

  return (
    <div className="card">
      <h3>Tu jornada</h3>
      {error && <div className="error-banner">{error}</div>}

      {!session && (
        <>
          <p>No has fichado entrada todavía.</p>
          <TaskSegmentFields
            tasks={tasks}
            taskId={clockInTaskId}
            onTaskIdChange={setClockInTaskId}
            description={clockInDescription}
            onDescriptionChange={setClockInDescription}
          />
          <button type="button" disabled={isSubmitting} onClick={handleClockIn}>
            Fichar entrada
          </button>
        </>
      )}

      {session && !openBreak && (
        <>
          <p>
            Trabajando desde las <strong>{formatTime(session.startedAt)}</strong>.
          </p>
          <p>
            {activeSegment
              ? `En: ${activeSegment.taskTitle ?? "sin tarea concreta"}${activeSegment.description ? ` — ${activeSegment.description}` : ""}`
              : "Todavía no has indicado en qué estás trabajando."}
          </p>

          {isSwitchingTask ? (
            <>
              <TaskSegmentFields
                tasks={tasks}
                taskId={switchTaskId}
                onTaskIdChange={setSwitchTaskId}
                description={switchDescription}
                onDescriptionChange={setSwitchDescription}
              />
              <div className="clock-actions">
                <button type="button" disabled={isSubmitting} onClick={handleSwitchTask}>
                  Guardar
                </button>
                <button type="button" className="secondary" onClick={() => setIsSwitchingTask(false)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div className="clock-actions">
              <button type="button" className="secondary" onClick={() => setIsSwitchingTask(true)}>
                Cambiar de tarea
              </button>
              <button
                type="button"
                className="secondary"
                disabled={isSubmitting}
                onClick={() => run(() => startBreak("lunch"))}
              >
                {BREAK_TYPE_LABEL.lunch}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={isSubmitting}
                onClick={() => run(() => startBreak("ergonomic"))}
              >
                {BREAK_TYPE_LABEL.ergonomic}
              </button>
              <button type="button" disabled={isSubmitting} onClick={() => run(clockOut, true)}>
                Fichar salida
              </button>
            </div>
          )}
        </>
      )}

      {session && openBreak && (
        <>
          <p>
            En {BREAK_TYPE_LABEL[openBreak.type].toLowerCase()} desde las{" "}
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
