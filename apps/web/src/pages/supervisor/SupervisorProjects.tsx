import type { ProjectDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { fetchMyProjects } from "../../api/tasks.js";

export function SupervisorProjects() {
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
  }, []);

  return (
    <div className="dashboard-grid">
      <h2>Mis proyectos</h2>
      {error && <div className="error-banner">{error}</div>}
      {!projects && !error && <p>Cargando…</p>}

      <div className="card">
        {projects && projects.length === 0 && <p>Todavía no tienes proyectos a cargo.</p>}
        {projects && projects.length > 0 && (
          <ul className="team-list">
            {projects.map((p) => (
              <li key={p.id} className="team-list__item">
                <span className="team-list__name">{p.name}</span>
                {p.isArchived && <span className="status-pill status-neutral">Archivado</span>}
                <Link to={`/supervisor/projects/${p.id}`} className="link-button">
                  Gestionar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
