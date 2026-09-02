import type { VacationRequestDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { cancelVacationRequest, createVacationRequest, fetchMyVacationRequests } from "../../api/vacations.js";
import { MiniCalendar } from "../../components/MiniCalendar.js";
import { VACATION_STATUS_LABEL, VACATION_STATUS_PILL_CLASS } from "../../constants.js";
import { todayDateString } from "../../lib/dates.js";

/** Cada día seleccionado en el calendario se manda como su propia
 * solicitud (startDate = endDate = ese día): "de forma puntual, día a
 * día", no un rango continuo. No hace falta ningún cambio en la API
 * para esto, ya aceptaba una solicitud de un solo día. */
function RequestVacationCalendar({ onSaved }: { onSaved: () => void }) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function toggleDate(date: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedDates.size === 0) return;
    setError(null);
    setIsSaving(true);
    try {
      for (const date of selectedDates) {
        await createVacationRequest({ startDate: date, endDate: date });
      }
      setSelectedDates(new Set());
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud");
    } finally {
      setIsSaving(false);
    }
  }

  const sortedDates = [...selectedDates].sort();

  return (
    <div className="card">
      <h3>Solicitar vacaciones</h3>
      {error && <div className="error-banner">{error}</div>}
      <MiniCalendar selectedDates={selectedDates} onToggleDate={toggleDate} />
      <p style={{ fontSize: "0.85rem", marginTop: "0.75rem" }}>
        {sortedDates.length === 0
          ? "Elige uno o varios días del año en curso."
          : `${sortedDates.length} día(s) elegido(s): ${sortedDates.join(", ")}`}
      </p>
      <button type="button" disabled={isSaving || sortedDates.length === 0} onClick={handleSubmit}>
        {isSaving ? "Enviando…" : "Solicitar"}
      </button>
    </div>
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

  // Vigentes o futuras aquí; lo que ya ha pasado se consulta en el
  // historial (issue #103), para no mezclar lo accionable con lo que ya
  // solo es un registro.
  const upcoming = requests?.filter((r) => r.endDate >= todayDateString()) ?? null;

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Vacaciones</h2>
        <Link to="/worker/vacations/history" className="link-button">
          Ver historial →
        </Link>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <RequestVacationCalendar onSaved={load} />

      <div className="card">
        <h3>Mis solicitudes</h3>
        {!upcoming && <p>Cargando…</p>}
        {upcoming && upcoming.length === 0 && <p>No tienes vacaciones solicitadas próximamente.</p>}
        {upcoming && upcoming.length > 0 && (
          <ul className="team-list">
            {upcoming.map((r) => (
              <li key={r.id} className="team-list__item">
                <span className="team-list__name">
                  {r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`}
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
    </div>
  );
}
