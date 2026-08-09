import type { WorkerDashboardResponse } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { fetchWorkerDashboard } from "../../api/dashboard.js";
import { ApiError } from "../../api/client.js";
import { ClockWidget } from "../../components/ClockWidget.js";
import { WeeklyHoursCard } from "../../components/WeeklyHoursCard.js";
import { useAuth } from "../../auth/AuthContext.js";

export function WorkerHome() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<WorkerDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(() => {
    fetchWorkerDashboard()
      .then(setDashboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el dashboard"));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="dashboard-grid">
      <h2>Hola, {user?.fullName}</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-grid__row">
        <ClockWidget onSessionChange={loadDashboard} />
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
