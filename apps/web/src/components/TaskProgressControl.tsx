import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client.js";
import { updateTaskProgress } from "../api/tasks.js";

/** Editable por trabajador y supervisor por igual (ver
 * apps/api/src/modules/tasks/routes.ts): independiente del estado de la
 * tarea, así que se guarda con su propio botón, no junto al estado. */
export function TaskProgressControl({
  taskId,
  progressPercentage,
  onSaved,
}: {
  taskId: string;
  progressPercentage: number;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(progressPercentage);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateTaskProgress(taskId, value);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el avance");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <span>Avance: {progressPercentage}%</span>
      <div className="progress-bar" style={{ margin: "0.35rem 0 0.75rem" }}>
        <div className="progress-bar__fill" style={{ width: `${progressPercentage}%` }} />
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          style={{ width: "5rem" }}
        />
        <button type="submit" disabled={isSaving || value === progressPercentage}>
          {isSaving ? "Guardando…" : "Guardar avance"}
        </button>
      </form>
    </div>
  );
}
