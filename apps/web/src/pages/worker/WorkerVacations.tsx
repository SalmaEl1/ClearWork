import type { ScheduledAbsenceDTO, VacationRequestDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api/client.js";
import {
  createScheduledAbsence,
  deleteScheduledAbsence,
  fetchMyScheduledAbsences,
} from "../../api/scheduledAbsences.js";
import { cancelVacationRequest, createVacationRequest, fetchMyVacationRequests } from "../../api/vacations.js";
import { VACATION_STATUS_LABEL, VACATION_STATUS_PILL_CLASS } from "../../constants.js";
import { todayDateString } from "../../lib/dates.js";

function RequestVacationForm({ onSaved }: { onSaved: () => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await createVacationRequest({ startDate, endDate });
      setStartDate("");
      setEndDate("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud");
    } finally {
      setIsSaving(false);
    }
  }

  const today = todayDateString();

  return (
    <div className="card">
      <h3>Solicitar vacaciones</h3>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Fecha de inicio</span>
          <input type="date" required min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          <span>Fecha de fin</span>
          <input
            type="date"
            required
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Enviando…" : "Solicitar"}
        </button>
      </form>
    </div>
  );
}

function ScheduleAbsenceForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
      <form onSubmit={handleSubmit}>
        <label>
          <span>Día</span>
          <input type="date" required min={todayDateString()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
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

function ScheduledAbsencesCard() {
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

  return (
    <>
      <ScheduleAbsenceForm onSaved={load} />
      <div className="card">
        <h3>Mis ausencias puntuales</h3>
        {error && <div className="error-banner">{error}</div>}
        {!absences && <p>Cargando…</p>}
        {absences && absences.length === 0 && <p>No tienes ausencias puntuales programadas.</p>}
        {absences && absences.length > 0 && (
          <ul className="team-list">
            {absences.map((a) => (
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
    </>
  );
}

export function WorkerVacations() {
  const [requests, setRequests] = useState<VacationRequestDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchMyVacationRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las solicitudes"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(id: string) {
    setError(null);
    try {
      await cancelVacationRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cancelar");
    }
  }

  return (
    <div className="dashboard-grid">
      <h2>Vacaciones y ausencias</h2>
      {error && <div className="error-banner">{error}</div>}

      <RequestVacationForm onSaved={load} />

      <div className="card">
        <h3>Mis solicitudes de vacaciones</h3>
        {!requests && <p>Cargando…</p>}
        {requests && requests.length === 0 && <p>Todavía no has solicitado vacaciones.</p>}
        {requests && requests.length > 0 && (
          <ul className="team-list">
            {requests.map((r) => (
              <li key={r.id} className="team-list__item">
                <span className="team-list__name">
                  {r.startDate} – {r.endDate}
                </span>
                <span className={`status-pill ${VACATION_STATUS_PILL_CLASS[r.status]}`}>
                  {VACATION_STATUS_LABEL[r.status]}
                </span>
                {r.status === "pending" && (
                  <button type="button" className="secondary" onClick={() => handleCancel(r.id)}>
                    Cancelar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ScheduledAbsencesCard />
    </div>
  );
}
