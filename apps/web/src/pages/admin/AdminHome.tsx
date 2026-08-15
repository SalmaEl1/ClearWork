import type { AdminActivityEventDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.js";
import { ApiError } from "../../api/client.js";
import { fetchAdminActivity, fetchAdminProjects, fetchAdminUsers } from "../../api/admin.js";
import { StatTile } from "../../components/StatTile.js";
import { ROLE_LABEL, TASK_STATUS_LABEL } from "../../constants.js";

type Stats = {
  admins: number;
  supervisors: number;
  workers: number;
  projects: number;
  archivedProjects: number;
};

function activityMessage(event: AdminActivityEventDTO): string {
  switch (event.type) {
    case "user_created":
      return `${event.userName} se dio de alta como ${ROLE_LABEL[event.role].toLowerCase()}`;
    case "task_status_changed":
      return `${event.userName} movió "${event.taskTitle}" (${event.projectName}) a ${TASK_STATUS_LABEL[event.toStatus]}`;
    case "member_joined":
      return `${event.userName} se incorporó a ${event.projectName}`;
    case "member_left":
      return `${event.userName} salió de ${event.projectName}`;
  }
}

/** "hace 5 min", "hace 2 h"… y a partir de una semana, la fecha. No hace
 * falta más precisión que esa en un feed de actividad. */
function formatRelativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

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
    </div>
  );
}

export function AdminHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<AdminActivityEventDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAdminUsers(), fetchAdminProjects(), fetchAdminActivity()])
      .then(([users, projects, activityEvents]) => {
        setStats({
          admins: users.filter((u) => u.role === "admin").length,
          supervisors: users.filter((u) => u.role === "supervisor").length,
          workers: users.filter((u) => u.role === "worker").length,
          projects: projects.length,
          archivedProjects: projects.filter((p) => p.isArchived).length,
        });
        setActivity(activityEvents);
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
            <StatTile label="Teletrabajadores" value={stats.workers} />
            <StatTile label="Administradores" value={stats.admins} />
            <StatTile label="Proyectos" value={stats.projects} />
            <StatTile label="Proyectos archivados" value={stats.archivedProjects} />
          </div>
        </div>
      )}

      <div className="dashboard-grid__row">
        <Link to="/admin/users" className="card admin-home__link">
          <h3>Usuarios</h3>
          <p>Crea, edita y gestiona cuentas de supervisores y teletrabajadores.</p>
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
