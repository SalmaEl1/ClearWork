import type { HolidayDTO, ScheduledAbsenceDTO } from "@clearwork/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { fetchHolidays } from "../../api/holidays.js";
import {
  createScheduledAbsence,
  deleteScheduledAbsence,
  fetchMyScheduledAbsences,
} from "../../api/scheduledAbsences.js";
import { MiniCalendar } from "../../components/MiniCalendar.js";
import { isWeekend, todayDateString, weekendDatesForYear } from "../../lib/dates.js";

type DateInputMode = "calendar" | "manual";

/** No se puede programar una ausencia en fin de semana ni festivo
 * nacional: ningún día de esos es laborable, así que no hay jornada de
 * la que ausentarse. A diferencia de las vacaciones (WorkerVacations.tsx,
 * donde excluir el fin de semana es un ajuste del admin), aquí es
 * incondicional. */
function ScheduleAbsenceForm({ onSaved }: { onSaved: () => void }) {
  const [dateMode, setDateMode] = useState<DateInputMode>("calendar");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHolidays(new Date().getFullYear())
      .then(setHolidays)
      .catch(() => setHolidays([]));
  }, []);

  const holidayLabelByDate = useMemo(() => new Map(holidays.map((h) => [h.date, h.label])), [holidays]);

  const disabledDates = useMemo(() => {
    const set = new Set(holidayLabelByDate.keys());
    for (const d of weekendDatesForYear(new Date().getFullYear())) set.add(d);
    return set;
  }, [holidayLabelByDate]);

  function disabledReason(d: string): string | undefined {
    return holidayLabelByDate.get(d) ?? "Fin de semana";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!date) {
      setError("Elige un día");
      return;
    }
    if (isWeekend(date) || holidayLabelByDate.has(date)) {
      setError(
        holidayLabelByDate.has(date)
          ? `No se puede programar una ausencia en festivo (${holidayLabelByDate.get(date)})`
          : "No se puede programar una ausencia en fin de semana",
      );
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await createScheduledAbsence({ date, startTime, endTime, reason });
      setDate("");
      setStartTime("");
      setEndTime("");
      setReason("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo programar la ausencia");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <h3>Programar una ausencia puntual</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="filter-bar">
        <button
          type="button"
          className={dateMode === "calendar" ? undefined : "secondary"}
          onClick={() => setDateMode("calendar")}
        >
          Calendario
        </button>
        <button
          type="button"
          className={dateMode === "manual" ? undefined : "secondary"}
          onClick={() => setDateMode("manual")}
        >
          Fecha manual
        </button>
      </div>

      {dateMode === "calendar" ? (
        <MiniCalendar
          selectedDates={date ? new Set([date]) : new Set()}
          onToggleDate={(d) => setDate(d === date ? "" : d)}
          disabledDates={disabledDates}
          disabledReason={disabledReason}
        />
      ) : (
        <label>
          <span>Día</span>
          <input type="date" required min={todayDateString()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <label>
          <span>Desde</span>
          <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="time" required min={startTime} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
        <label>
          <span>Motivo</span>
          <input
            required
            placeholder="Cita médica, gestión legal…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Programar"}
        </button>
      </form>
    </div>
  );
}

export function WorkerAbsences() {
  const [absences, setAbsences] = useState<ScheduledAbsenceDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchMyScheduledAbsences()
      .then(setAbsences)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las ausencias"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteScheduledAbsence(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
    }
  }

  const upcoming = absences?.filter((a) => a.date >= todayDateString()) ?? null;

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Ausencias</h2>
        <Link to="/worker/absences/history" className="link-button">
          Ver historial →
        </Link>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <ScheduleAbsenceForm onSaved={load} />

      <div className="card">
        <h3>Mis ausencias puntuales</h3>
        {!upcoming && <p>Cargando…</p>}
        {upcoming && upcoming.length === 0 && <p>No tienes ausencias puntuales programadas.</p>}
        {upcoming && upcoming.length > 0 && (
          <ul className="team-list">
            {upcoming.map((a) => (
              <li key={a.id} className="team-list__item">
                <span className="team-list__name">{a.reason}</span>
                <span className="team-list__hours">
                  {a.date}, {a.startTime}–{a.endTime}
                </span>
                <button type="button" className="secondary" onClick={() => handleDelete(a.id)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
