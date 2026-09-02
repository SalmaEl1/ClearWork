import type { VacationRequestDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchMyVacationRequests } from "../../api/vacations.js";
import { BackLink } from "../../components/BackLink.js";
import { Pagination } from "../../components/Pagination.js";
import { VACATION_STATUS_LABEL, VACATION_STATUS_PILL_CLASS } from "../../constants.js";
import { todayDateString } from "../../lib/dates.js";
import { usePaginatedList } from "../../lib/usePaginatedList.js";

export function WorkerVacationsHistory() {
  const [requests, setRequests] = useState<VacationRequestDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyVacationRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las solicitudes"));
  }, []);

  const past = requests?.filter((r) => r.endDate < todayDateString()) ?? null;
  const { page, pageSize, total, pageItems, setPage, onPageSizeChange } = usePaginatedList(past);

  return (
    <div className="dashboard-grid">
      <div>
        <BackLink to="/worker/vacations">Volver a vacaciones</BackLink>
      </div>
      <h2>Historial de vacaciones</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {!past && !error && <p>Cargando…</p>}
        {past && past.length === 0 && <p>Todavía no hay vacaciones pasadas que mostrar.</p>}
        {past && past.length > 0 && (
          <ul className="team-list">
            {(pageItems ?? []).map((r) => (
              <li key={r.id} className="team-list__item">
                <span className="team-list__name">
                  {r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`}
                </span>
                <span className={`status-pill ${VACATION_STATUS_PILL_CLASS[r.status]}`}>
                  {VACATION_STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
