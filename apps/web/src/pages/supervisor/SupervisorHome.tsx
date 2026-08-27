import type { SupervisorDashboardResponse } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { fetchSupervisorDashboard } from "../../api/dashboard.js";
import { ApiError } from "../../api/client.js";
import { ProjectProgressList } from "../../components/ProjectProgressList.js";
import { TeamStatusList } from "../../components/TeamStatusList.js";
import { WeekNav } from "../../components/WeekNav.js";
import { useAuth } from "../../auth/AuthContext.js";

export function SupervisorHome() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<SupervisorDashboardResponse | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(() => {
    fetchSupervisorDashboard(weekOffset)
      .then(setDashboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el dashboard"));
  }, [weekOffset]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="dashboard-grid">
      <h2>Hola, {user?.fullName}</h2>

      {error && <div className="error-banner">{error}</div>}

      <WeekNav
        weekOffset={weekOffset}
        onChange={setWeekOffset}
        weekStart={dashboard?.weekStart}
        weekEnd={dashboard?.weekEnd}
      />

      {dashboard && (
        <div className="dashboard-grid__row">
          <TeamStatusList team={dashboard.team} onChanged={loadDashboard} />
          <ProjectProgressList projects={dashboard.projects} />
        </div>
      )}
    </div>
  );
}
