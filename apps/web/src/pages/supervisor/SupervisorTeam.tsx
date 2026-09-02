import type { SupervisorDashboardResponse } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchSupervisorDashboard } from "../../api/dashboard.js";
import { TeamStatusList } from "../../components/TeamStatusList.js";

/** Vista dedicada al detalle de la jornada de cada persona del equipo:
 * el mismo TeamStatusList que ya resume el panel principal, pero como
 * pantalla propia, sin compartir espacio con el resto del dashboard. */
export function SupervisorTeam() {
  const [dashboard, setDashboard] = useState<SupervisorDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchSupervisorDashboard()
      .then(setDashboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el equipo"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-grid">
      <h2>Equipo</h2>
      {error && <div className="error-banner">{error}</div>}
      {!dashboard && !error && <p>Cargando…</p>}

      {dashboard && <TeamStatusList team={dashboard.team} onChanged={load} />}
    </div>
  );
}
