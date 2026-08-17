import type { AdminUserSummary, ProjectDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client.js";
import {
  createAdminProject,
  deleteAdminProject,
  exportAdminProjectsCsv,
  fetchAdminProjects,
  fetchAllAdminUsers,
  updateAdminProject,
} from "../../api/admin.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { Modal } from "../../components/Modal.js";
import { Pagination } from "../../components/Pagination.js";

const PAGE_SIZE = 20;

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

function ProjectRow({
  project,
  supervisorName,
  isSelected,
  onToggleSelect,
}: {
  project: ProjectDTO;
  supervisorName: string;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          style={{ width: "auto" }}
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Seleccionar ${project.name}`}
        />
      </td>
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
  const [total, setTotal] = useState(0);
  const [supervisors, setSupervisors] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>("all");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<"delete" | null>(null);
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  // Espera una pausa al teclear antes de disparar la búsqueda: si se
  // pidiera una página nueva en cada tecla, cada letra sería una petición
  // (y, con la paginación en servidor, un salto de página visible).
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Cambiar de filtro o de término de búsqueda invalida la página en la
  // que se estaba: sin esto, buscar algo con menos resultados podría
  // dejar la vista en una página que ya no existe.
  useEffect(() => {
    setPage(1);
  }, [search, archivedFilter]);

  const load = useCallback(() => {
    fetchAdminProjects({
      search: search || undefined,
      archived: archivedFilter === "all" ? undefined : archivedFilter === "archived",
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        setProjects(result.items);
        setTotal(result.total);
        setSelectedIds(new Set());
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
  }, [search, archivedFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Los supervisores se cargan aparte: los necesita tanto el formulario de
  // alta como la columna "Supervisor/a" de la tabla, y no cambian al
  // paginar o buscar proyectos.
  const loadSupervisors = useCallback(() => {
    fetchAllAdminUsers()
      .then((users) => setSupervisors(users.filter((u) => u.role === "supervisor")))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
  }, []);

  useEffect(() => {
    loadSupervisors();
  }, [loadSupervisors]);

  function handleCreated() {
    setIsCreateOpen(false);
    load();
  }

  async function handleExport() {
    setError(null);
    setIsExporting(true);
    try {
      await exportAdminProjectsCsv({
        search: search || undefined,
        archived: archivedFilter === "all" ? undefined : archivedFilter === "archived",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo exportar");
    } finally {
      setIsExporting(false);
    }
  }

  function toggleSelect(projectId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  const allSelected = (projects ?? []).length > 0 && (projects ?? []).every((p) => selectedIds.has(p.id));

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set((projects ?? []).map((p) => p.id)));
  }

  async function runBulk(ids: string[], action: (id: string) => Promise<unknown>, verb: string) {
    setError(null);
    setIsBulkWorking(true);
    const failures: string[] = [];
    for (const id of ids) {
      const target = projects?.find((p) => p.id === id);
      try {
        await action(id);
      } catch (err) {
        failures.push(`${target?.name ?? id}: ${err instanceof ApiError ? err.message : "error desconocido"}`);
      }
    }
    setIsBulkWorking(false);
    setBulkConfirm(null);
    if (failures.length > 0) {
      setError(`No se pudo completar la acción en ${failures.length} proyecto(s): ${failures.join("; ")}`);
    }
    load();
  }

  function handleBulkArchive(archive: boolean) {
    void runBulk(
      [...selectedIds],
      (id) => updateAdminProject(id, { isArchived: archive }),
      archive ? "archivar" : "desarchivar",
    );
  }

  function handleBulkDelete() {
    void runBulk([...selectedIds], (id) => deleteAdminProject(id), "eliminar");
  }

  const supervisorName = (id: string) => supervisors.find((s) => s.id === id)?.fullName ?? "—";

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Proyectos</h2>
        <div className="row-actions">
          <button type="button" className="secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exportando…" : "Exportar CSV"}
          </button>
          <button type="button" onClick={() => setIsCreateOpen(true)}>
            + Añadir proyecto
          </button>
        </div>
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

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Buscar por nombre o supervisor/a…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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

        {projects && projects.length === 0 && (
          <p>{search || archivedFilter !== "all" ? "Ningún proyecto coincide con la búsqueda." : "Todavía no hay proyectos."}</p>
        )}

        {selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span>{selectedIds.size} seleccionado(s)</span>
            <button type="button" className="secondary" disabled={isBulkWorking} onClick={() => handleBulkArchive(true)}>
              Archivar
            </button>
            <button type="button" className="secondary" disabled={isBulkWorking} onClick={() => handleBulkArchive(false)}>
              Desarchivar
            </button>
            <button type="button" className="danger" disabled={isBulkWorking} onClick={() => setBulkConfirm("delete")}>
              Eliminar seleccionados
            </button>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th>Nombre</th>
                  <th>Supervisor/a</th>
                  <th>Archivado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    supervisorName={supervisorName(p.supervisorId)}
                    isSelected={selectedIds.has(p.id)}
                    onToggleSelect={() => toggleSelect(p.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bulkConfirm === "delete" && (
          <ConfirmDialog
            title="Eliminar proyectos seleccionados"
            message={`¿Eliminar ${selectedIds.size} proyecto(s)? Se borrarán también sus tareas y la membresía de su equipo. Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            isConfirming={isBulkWorking}
            onConfirm={handleBulkDelete}
            onCancel={() => setBulkConfirm(null)}
          />
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
