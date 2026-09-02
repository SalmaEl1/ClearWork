import { useEffect, useState } from "react";
import { fetchLeaves } from "../../api/leaves.js";
import { fetchMyScheduledAbsences } from "../../api/scheduledAbsences.js";
import { fetchMyVacationRequests } from "../../api/vacations.js";
import { fetchWorkSessionHistory } from "../../api/workSessions.js";
import { ApiError } from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.js";
import { HistoryTable } from "../../components/HistoryTable.js";
import { Pagination } from "../../components/Pagination.js";
import { buildHistoryEntries } from "../../lib/historyEntries.js";
import type { HistoryEntry } from "../../lib/historyEntries.js";
import { usePaginatedList } from "../../lib/usePaginatedList.js";

export function WorkerHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { page, pageSize, total, pageItems, setPage, onPageSizeChange } = usePaginatedList(entries);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchWorkSessionHistory(),
      fetchLeaves(user.id),
      fetchMyVacationRequests(),
      fetchMyScheduledAbsences(),
    ])
      .then(([sessions, leaves, vacations, absences]) =>
        setEntries(buildHistoryEntries(sessions, leaves, vacations, absences)),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el historial"));
  }, [user]);

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Historial de fichajes</h2>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!entries && !error && <p>Cargando…</p>}

      {entries && (
        <div className="card">
          <HistoryTable entries={pageItems ?? []} />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
