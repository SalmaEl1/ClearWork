import type { ProjectDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { fetchMyProjects } from "../../api/tasks.js";

/** Un supervisor tiene como mucho un proyecto a su cargo, así que esta
 * pantalla no es un listado: en cuanto sabe cuál es su proyecto (si
 * tiene uno), va directa a su gestión en vez de mostrar un paso
 * intermedio de "elige uno de la lista". */
export function SupervisorProjects() {
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar tu proyecto"));
  }, []);

  if (error) {
    return (
      <div className="dashboard-grid">
        <h2>Mi proyecto</h2>
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  if (!projects) {
    return (
      <div className="dashboard-grid">
        <h2>Mi proyecto</h2>
        <p>Cargando…</p>
      </div>
    );
  }

  const project = projects[0];
  if (project) {
    return <Navigate to={`/supervisor/projects/${project.id}`} replace />;
  }

  return (
    <div className="dashboard-grid">
      <h2>Mi proyecto</h2>
      <div className="card">
        <p>Todavía no tienes ningún proyecto a cargo.</p>
      </div>
    </div>
  );
}
