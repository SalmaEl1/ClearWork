import type { TaskTimeEntryDTO, TimeEntryUnit } from "@clearwork/shared";
import { TIME_ENTRY_UNITS } from "@clearwork/shared";
import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client.js";
import { logTaskTime } from "../api/tasks.js";

const UNIT_LABEL: Record<TimeEntryUnit, string> = {
  hours: "horas",
  minutes: "minutos",
  days: "días",
};

function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}min`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Compartida por la vista de detalle de tarea del trabajador y del
 * supervisor (issue #114): la estimación de horas se edita desde el
 * formulario de editar tarea (ver TaskForm en SupervisorTasks.tsx), esta
 * tarjeta solo registra tiempo nuevo y muestra lo ya registrado.
 */
export function TaskTimeTrackingCard({
  taskId,
  estimatedHours,
  loggedMinutes,
  remainingHours,
  timeEntries,
  onSaved,
}: {
  taskId: string;
  estimatedHours: number | null;
  loggedMinutes: number;
  remainingHours: number | null;
  timeEntries: TaskTimeEntryDTO[];
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<TimeEntryUnit>("hours");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await logTaskTime(taskId, { amount: Number(amount), unit, description });
      setAmount("");
      setDescription("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el tiempo");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <h3>Horas dedicadas</h3>
      <p>
        {estimatedHours !== null && <>Estimadas: {estimatedHours} h · </>}
        Registradas: {formatHoursMinutes(loggedMinutes)}
        {remainingHours !== null && <> · Restantes: {remainingHours.toFixed(1)} h</>}
      </p>

      {error && <div className="error-banner">{error}</div>}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}
      >
        <label>
          <span>Cantidad</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "6rem" }}
          />
        </label>
        <label>
          <span>Unidad</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as TimeEntryUnit)}>
            {TIME_ENTRY_UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1, minWidth: "12rem" }}>
          <span>Qué se hizo</span>
          <input required value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Registrar"}
        </button>
      </form>

      {timeEntries.length === 0 && <p>Todavía no se ha registrado tiempo en esta tarea.</p>}
      {timeEntries.length > 0 && (
        <ul className="activity-list">
          {timeEntries.map((e) => (
            <li key={e.id} className="activity-list__item">
              <span>
                <strong>{e.loggedByName}</strong> registró {formatHoursMinutes(e.minutes)}: {e.description}
              </span>
              <span className="activity-list__time">{formatDateTime(e.loggedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
