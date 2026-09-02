import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { fetchSupervisorDashboard } from "../../api/dashboard.js";
import { fetchLeaves } from "../../api/leaves.js";
import { fetchTeamMemberScheduledAbsences } from "../../api/scheduledAbsences.js";
import { fetchTeamVacationRequests } from "../../api/vacations.js";
import { fetchTeamMemberWorkSessionHistory } from "../../api/workSessions.js";
import { BackLink } from "../../components/BackLink.js";
import { HistoryTable } from "../../components/HistoryTable.js";
import { Pagination } from "../../components/Pagination.js";
import { buildHistoryEntries } from "../../lib/historyEntries.js";
import type { HistoryEntry } from "../../lib/historyEntries.js";
import { usePaginatedList } from "../../lib/usePaginatedList.js";

/** Historial de jornada de alguien del equipo, con los mismos periodos
 * (bajas, vacaciones, ausencias puntuales) reflejados que en la vista
 * propia del trabajador — issue #101. El nombre se saca del dashboard del
 * supervisor en vez de tener un endpoint propio solo para eso. */
export function SupervisorMemberHistory() {
  const { id } = useParams<{ id: string }>();
  const [memberName, setMemberName] = useState<string | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { page, pageSize, total, pageItems, setPage, onPageSizeChange } = usePaginatedList(entries);

  useEffect(() => {
    if (!id) return;
    fetchSupervisorDashboard()
      .then((dashboard) => setMemberName(dashboard.team.find((m) => m.id === id)?.fullName ?? null));

    Promise.all([
      fetchTeamMemberWorkSessionHistory(id),
      fetchLeaves(id),
      fetchTeamVacationRequests(),
      fetchTeamMemberScheduledAbsences(id),
    ])
      .then(([sessions, leaves, teamVacations, absences]) => {
        const vacations = teamVacations.filter((v) => v.userId === id);
        setEntries(buildHistoryEntries(sessions, leaves, vacations, absences));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el historial"));
  }, [id]);

  return (
    <div className="dashboard-grid">
      <div>
        <BackLink to="/supervisor/team">Volver al equipo</BackLink>
      </div>
      <h2>Historial de fichajes{memberName ? `: ${memberName}` : ""}</h2>
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
