import type { AdminUserSummary, ProjectDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { createAdminProject, fetchAdminProjects, fetchAdminUsers } from "../../api/admin.js";
import { Modal } from "../../components/Modal.js";

function CreateProjectForm({
  supervisors,
  onCreated,
}: {
  supervisors: AdminUserSummary[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // `supervisors` llega vacío en el primer render (todavía no ha
  // respondido la API) y se rellena después: sin este efecto, el valor
  // por defecto del desplegable se quedaría congelado en "" para siempre,
  // aunque ya hubiera supervisores disponibles.
  useEffect(() => {
    if (!supervisorId && supervisors.length > 0) {
      setSupervisorId(supervisors[0]?.id ?? "");
    }
  }, [supervisors, supervisorId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!supervisorId) {
      setError("Necesitas al menos un supervisor creado antes de crear un proyecto");
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminProject({ name, description: description || null, supervisorId });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el proyecto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Nombre</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span>Descripción (opcional)</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          <span>Supervisor/a</span>
          <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
            {supervisors.length === 0 && <option value="">No hay supervisores creados</option>}
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isSubmitting || supervisors.length === 0}>
          {isSubmitting ? "Creando…" : "Crear proyecto"}
        </button>
      </form>
    </>
  );
}

function ProjectRow({ project, supervisorName }: { project: ProjectDTO; supervisorName: string }) {
  return (
    <tr>
      <td>{project.name}</td>
      <td>{supervisorName}</td>
      <td>{project.isArchived ? "Sí" : "No"}</td>
      <td>
        <Link to={`/admin/projects/${project.id}`} className="link-button">
          Gestionar
        </Link>
      </td>
    </tr>
  );
}

type ArchivedFilter = "all" | "active" | "archived";

export function AdminProjects() {
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>("all");

  const load = useCallback(() => {
    Promise.all([fetchAdminProjects(), fetchAdminUsers()])
      .then(([projectList, userList]) => {
        setProjects(projectList);
        setUsers(userList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleCreated() {
    setIsCreateOpen(false);
    load();
  }

  const supervisors = users.filter((u) => u.role === "supervisor");
  const supervisorName = (id: string) => supervisors.find((s) => s.id === id)?.fullName ?? "—";

  const filteredProjects = (projects ?? []).filter((p) => {
    if (archivedFilter === "active" && p.isArchived) return false;
    if (archivedFilter === "archived" && !p.isArchived) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return p.name.toLowerCase().includes(term) || supervisorName(p.supervisorId).toLowerCase().includes(term);
  });

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Proyectos</h2>
        <button type="button" onClick={() => setIsCreateOpen(true)}>
          + Añadir proyecto
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {isCreateOpen && (
        <Modal title="Crear proyecto" onClose={() => setIsCreateOpen(false)}>
          <CreateProjectForm supervisors={supervisors} onCreated={handleCreated} />
        </Modal>
      )}

      <div className="card">
        <h3>Todos los proyectos</h3>
        {!projects && !error && <p>Cargando…</p>}

        {projects && projects.length === 0 && <p>Todavía no hay proyectos.</p>}

        {projects && projects.length > 0 && (
          <>
            <div className="filter-bar">
              <input
                type="search"
                placeholder="Buscar por nombre o supervisor/a…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={archivedFilter}
                onChange={(e) => setArchivedFilter(e.target.value as ArchivedFilter)}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="archived">Archivados</option>
              </select>
            </div>

            {filteredProjects.length === 0 ? (
              <p>Ningún proyecto coincide con la búsqueda.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Supervisor/a</th>
                      <th>Archivado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => (
                      <ProjectRow key={p.id} project={p} supervisorName={supervisorName(p.supervisorId)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
