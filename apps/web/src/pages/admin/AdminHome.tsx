import type { AdminActivityEventDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.js";
import { ApiError } from "../../api/client.js";
import { fetchAdminActivity, fetchAllAdminProjects, fetchAllAdminUsers } from "../../api/admin.js";
import { StatTile } from "../../components/StatTile.js";
import { activityMessage, formatRelativeTime } from "../../lib/activity.js";

type Stats = {
  admins: number;
  supervisors: number;
  workers: number;
  projects: number;
  archivedProjects: number;
};

const HOME_ACTIVITY_LIMIT = 5;

function ActivityCard({ events }: { events: AdminActivityEventDTO[] }) {
  return (
    <div className="card">
      <h3>Actividad reciente</h3>
      {events.length === 0 ? (
        <p>Todavía no hay actividad que mostrar.</p>
      ) : (
        <ul className="activity-list">
          {events.map((event, index) => (
            <li key={`${event.type}-${event.occurredAt}-${index}`} className="activity-list__item">
              <span>{activityMessage(event)}</span>
              <span className="activity-list__time">{formatRelativeTime(event.occurredAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/admin/activity" className="link-button" style={{ marginTop: "1rem" }}>
        Ver toda la actividad →
      </Link>
    </div>
  );
}

export function AdminHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<AdminActivityEventDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchAllAdminUsers(),
      fetchAllAdminProjects(),
      fetchAdminActivity({ pageSize: HOME_ACTIVITY_LIMIT }),
    ])
      .then(([users, projects, activityPage]) => {
        setStats({
          admins: users.filter((u) => u.role === "admin").length,
          supervisors: users.filter((u) => u.role === "supervisor").length,
          workers: users.filter((u) => u.role === "worker").length,
          projects: projects.length,
          archivedProjects: projects.filter((p) => p.isArchived).length,
        });
        setActivity(activityPage.items);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el resumen"));
  }, []);

  return (
    <div className="dashboard-grid">
      <h2>Hola, {user?.fullName}</h2>
      <p>Desde aquí gestionas las cuentas y los proyectos de ClearWork.</p>
      {error && <div className="error-banner">{error}</div>}
      {!stats && !error && <p>Cargando…</p>}

      {stats && (
        <div className="card">
          <div className="stat-grid">
            <StatTile label="Supervisores" value={stats.supervisors} />
            <StatTile label="Trabajadores" value={stats.workers} />
            <StatTile label="Administradores" value={stats.admins} />
            <StatTile label="Proyectos" value={stats.projects} />
            <StatTile label="Proyectos archivados" value={stats.archivedProjects} />
          </div>
        </div>
      )}

      <div className="dashboard-grid__row">
        <Link to="/admin/users" className="card admin-home__link">
          <h3>Usuarios</h3>
          <p>Crea, edita y gestiona cuentas de supervisores y trabajadores.</p>
        </Link>
        <Link to="/admin/projects" className="card admin-home__link">
          <h3>Proyectos</h3>
          <p>Crea proyectos, asígnales supervisor y gestiona su equipo.</p>
        </Link>
      </div>

      {activity && <ActivityCard events={activity} />}
    </div>
  );
}
