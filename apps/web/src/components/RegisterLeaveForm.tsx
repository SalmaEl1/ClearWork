import type { LeaveType } from "@clearwork/shared";
import { LEAVE_TYPES } from "@clearwork/shared";
import { useState } from "react";
import type { FormEvent } from "react";
import { createLeave } from "../api/leaves.js";
import { ApiError } from "../api/client.js";
import { LEAVE_TYPE_LABEL } from "../constants.js";

/** Formulario para dar de alta una baja/ausencia prolongada a un
 * miembro del equipo, embebido en un Modal por quien lo use (dashboard
 * del supervisor, ficha del admin). Sin fecha de fin la baja queda
 * abierta: "en curso" hasta que se registre cuándo terminó. */
export function RegisterLeaveForm({
  userId,
  onSaved,
}: {
  userId: string;
  onSaved: () => void;
}) {
  const [type, setType] = useState<LeaveType>(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await createLeave({ userId, type, startDate, endDate: endDate || null });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la baja");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      <label>
        <span>Tipo</span>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAVE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Fecha de inicio</span>
        <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>
      <label>
        <span>Fecha de fin (opcional, si ya se conoce)</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>
      <button type="submit" disabled={isSaving}>
        {isSaving ? "Guardando…" : "Registrar baja"}
      </button>
    </form>
  );
}
