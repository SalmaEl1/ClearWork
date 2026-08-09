import type { SupervisorDashboardResponse } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { fetchSupervisorDashboard } from "../../api/dashboard.js";
import { ApiError } from "../../api/client.js";
import { ProjectProgressList } from "../../components/ProjectProgressList.js";
import { TeamStatusList } from "../../components/TeamStatusList.js";
import { useAuth } from "../../auth/AuthContext.js";

export function SupervisorHome() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<SupervisorDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSupervisorDashboard()
      .then(setDashboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el dashboard"));
  }, []);

  async function copyId() {
    if (!user) return;
    await navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="dashboard-grid">
      <h2>Hola, {user?.fullName}</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <p>
          Tu equipo necesita este ID para registrarse bajo tu supervisión:{" "}
          <code className="supervisor-id">{user?.id}</code>
        </p>
        <button type="button" className="secondary" onClick={copyId}>
          {copied ? "Copiado" : "Copiar ID"}
        </button>
      </div>

      {dashboard && (
        <div className="dashboard-grid__row">
          <TeamStatusList team={dashboard.team} />
          <ProjectProgressList projects={dashboard.projects} />
        </div>
      )}
    </div>
  );
}
