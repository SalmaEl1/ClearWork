import type { ProjectTaskSummary } from "@clearwork/shared";

export function ProjectProgressList({ projects }: { projects: ProjectTaskSummary[] }) {
  if (projects.length === 0) {
    return (
      <div className="card">
        <h3>Proyectos</h3>
        <p>Todavía no has creado ningún proyecto.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Proyectos</h3>
      <ul className="project-list">
        {projects.map((project) => {
          const total = project.pending + project.inProgress + project.done;
          return (
            <li key={project.projectId} className="project-list__item">
              <div className="project-list__header">
                <span>{project.projectName}</span>
                <span className="project-list__total">{total} tareas</span>
              </div>
              {total > 0 && (
                <div className="progress-bar progress-bar--stacked">
                  <div
                    className="progress-bar__fill status-neutral"
                    style={{ width: `${(project.pending / total) * 100}%` }}
                    title={`Pendiente: ${project.pending}`}
                  />
                  <div
                    className="progress-bar__fill status-warning"
                    style={{ width: `${(project.inProgress / total) * 100}%` }}
                    title={`En progreso: ${project.inProgress}`}
                  />
                  <div
                    className="progress-bar__fill status-ok"
                    style={{ width: `${(project.done / total) * 100}%` }}
                    title={`Completada: ${project.done}`}
                  />
                </div>
              )}
              <div className="project-list__legend">
                <span>Pendiente: {project.pending}</span>
                <span>En progreso: {project.inProgress}</span>
                <span>Completada: {project.done}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
