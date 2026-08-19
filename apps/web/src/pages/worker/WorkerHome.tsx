import type { WorkerDashboardResponse } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { fetchWorkerDashboard } from "../../api/dashboard.js";
import { ApiError } from "../../api/client.js";
import { ClockWidget } from "../../components/ClockWidget.js";
import { WeeklyHoursCard } from "../../components/WeeklyHoursCard.js";
import { WeekNav } from "../../components/WeekNav.js";
import { useAuth } from "../../auth/AuthContext.js";

export function WorkerHome() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<WorkerDashboardResponse | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(() => {
    fetchWorkerDashboard(weekOffset)
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

      <div className="dashboard-grid__row">
        {weekOffset === 0 && <ClockWidget onSessionChange={loadDashboard} />}
        {dashboard && (
          <WeeklyHoursCard
            workedHours={dashboard.workedHours}
            targetHours={dashboard.targetHours}
            status={dashboard.status}
          />
        )}
      </div>
    </div>
  );
}
