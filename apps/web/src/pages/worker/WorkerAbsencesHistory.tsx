import type { ScheduledAbsenceDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchMyScheduledAbsences } from "../../api/scheduledAbsences.js";
import { BackLink } from "../../components/BackLink.js";
import { Pagination } from "../../components/Pagination.js";
import { todayDateString } from "../../lib/dates.js";
import { usePaginatedList } from "../../lib/usePaginatedList.js";

export function WorkerAbsencesHistory() {
  const [absences, setAbsences] = useState<ScheduledAbsenceDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyScheduledAbsences()
      .then(setAbsences)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las ausencias"));
  }, []);

  const past = absences?.filter((a) => a.date < todayDateString()) ?? null;
  const { page, pageSize, total, pageItems, setPage, onPageSizeChange } = usePaginatedList(past);

  return (
    <div className="dashboard-grid">
      <div>
        <BackLink to="/worker/absences">Volver a ausencias</BackLink>
      </div>
      <h2>Historial de ausencias</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {!past && !error && <p>Cargando…</p>}
        {past && past.length === 0 && <p>Todavía no hay ausencias pasadas que mostrar.</p>}
        {past && past.length > 0 && (
          <ul className="team-list">
            {(pageItems ?? []).map((a) => (
              <li key={a.id} className="team-list__item">
                <span className="team-list__name">{a.reason}</span>
                <span className="team-list__hours">
                  {a.date}, {a.startTime}–{a.endTime}
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
