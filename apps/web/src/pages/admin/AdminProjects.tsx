import type { AdminUserSummary, ProjectDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import { createAdminProject, fetchAdminProjects } from "../../api/admin.js";
import { fetchAdminUsers } from "../../api/admin.js";

function CreateProjectForm({
  supervisors,
  onCreated,
}: {
  supervisors: AdminUserSummary[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supervisorId, setSupervisorId] = useState(supervisors[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setName("");
      setDescription("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el proyecto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h3>Crear proyecto</h3>
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
    </div>
  );
}

export function AdminProjects() {
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const supervisors = users.filter((u) => u.role === "supervisor");
  const supervisorName = (id: string) => supervisors.find((s) => s.id === id)?.fullName ?? "—";

  return (
    <div className="dashboard-grid">
      <h2>Proyectos</h2>
      {error && <div className="error-banner">{error}</div>}

      <CreateProjectForm supervisors={supervisors} onCreated={load} />

      <div className="card">
        <h3>Todos los proyectos</h3>
        {projects && projects.length === 0 && <p>Todavía no hay proyectos.</p>}
        {projects && projects.length > 0 && (
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
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{supervisorName(p.supervisorId)}</td>
                    <td>{p.isArchived ? "Sí" : "No"}</td>
                    <td>
                      <Link to={`/admin/projects/${p.id}`}>Gestionar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
