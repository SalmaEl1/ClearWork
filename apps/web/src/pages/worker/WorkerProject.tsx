import { useEffect, useState } from "react";
import type { ProjectDetailDTO } from "@clearwork/shared";
import { ApiError } from "../../api/client.js";
import { fetchMyProjectAsWorker } from "../../api/workerProject.js";

/** Solo lectura: el trabajador nunca gestiona el proyecto, solo ve sus
 * datos (incluidos los del cliente, que da de alta el admin) y quién
 * más forma parte del equipo. */
export function WorkerProject() {
  const [project, setProject] = useState<ProjectDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyProjectAsWorker()
      .then(setProject)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el proyecto"));
  }, []);

  return (
    <div className="dashboard-grid">
      <h2>{project?.name ?? "Mi proyecto"}</h2>
      {error && <div className="error-banner">{error}</div>}
      {!project && !error && <p>Cargando…</p>}

      {project && (
        <div className="card">
          {project.description && <p>{project.description}</p>}

          <p className="project-client-info">
            Cliente: {project.clientName} · Contacto: {project.clientContact}
          </p>

          <p>Supervisor/a: {project.supervisorName}</p>

          <h3>Equipo</h3>
          {project.members.length === 0 && <p>Todavía no hay nadie más en el equipo.</p>}
          {project.members.length > 0 && (
            <ul className="team-list">
              {project.members.map((m) => (
                <li key={m.userId} className="team-list__item">
                  <span className="team-list__name">{m.fullName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
