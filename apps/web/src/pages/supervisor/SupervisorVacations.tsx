import type { TeamVacationRequestDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { approveVacationRequest, fetchTeamVacationRequests, rejectVacationRequest } from "../../api/vacations.js";
import { Pagination } from "../../components/Pagination.js";
import { VACATION_STATUS_LABEL, VACATION_STATUS_PILL_CLASS } from "../../constants.js";
import { todayDateString } from "../../lib/dates.js";
import { usePaginatedList } from "../../lib/usePaginatedList.js";

export function SupervisorVacations() {
  const [requests, setRequests] = useState<TeamVacationRequestDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { page, pageSize, total, pageItems, setPage, onPageSizeChange } = usePaginatedList(requests);

  const load = useCallback(() => {
    fetchTeamVacationRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las solicitudes"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id: string) {
    setError(null);
    try {
      await approveVacationRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo aprobar");
    }
  }

  async function handleReject(id: string) {
    setError(null);
    try {
      await rejectVacationRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo rechazar");
    }
  }

  return (
    <div className="dashboard-grid">
      <h2>Vacaciones del equipo</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {!requests && <p>Cargando…</p>}
        {requests && requests.length === 0 && <p>Tu equipo no tiene solicitudes de vacaciones.</p>}
        {requests && requests.length > 0 && (
          <ul className="team-list">
            {(pageItems ?? []).map((r) => {
              // Mientras no haya llegado la fecha de inicio, la decisión
              // se puede tomar o cambiar; una vez empiezan las
              // vacaciones (o si se cancelaron), queda fija.
              const canDecide = r.status !== "cancelled" && r.startDate > todayDateString();
              return (
                <li key={r.id} className="team-list__item">
                  <span className="team-list__name">{r.userFullName}</span>
                  <span className="team-list__hours">
                    {r.startDate} – {r.endDate}
                  </span>
                  <span className={`status-pill ${VACATION_STATUS_PILL_CLASS[r.status]}`}>
                    {VACATION_STATUS_LABEL[r.status]}
                  </span>
                  {canDecide && (
                    <div className="row-actions">
                      {r.status !== "approved" && (
                        <button type="button" onClick={() => handleApprove(r.id)}>
                          Aprobar
                        </button>
                      )}
                      {r.status !== "rejected" && (
                        <button type="button" className="secondary" onClick={() => handleReject(r.id)}>
                          Rechazar
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
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
