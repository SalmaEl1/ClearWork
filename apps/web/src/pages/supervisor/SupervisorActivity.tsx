import type { ActivityEventType, AdminActivityEventDTO } from "@clearwork/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client.js";
import { exportTeamActivityCsv, fetchTeamActivity } from "../../api/supervisorActivity.js";
import { Pagination } from "../../components/Pagination.js";
import type { ActivityCategory } from "../../constants.js";
import { ACTIVITY_CATEGORIES, ACTIVITY_EVENT_TYPE_LABEL } from "../../constants.js";
import { activityIcon, activityMessage, formatRelativeTime } from "../../lib/activity.js";

const DEFAULT_PAGE_SIZE = 10;

// Sin "accounts": gestionar cuentas es cosa del admin, no tiene sentido
// ofrecérselo como filtro a un supervisor cuyo feed nunca va a traer
// ninguno de esos cuatro tipos (listTeamActivity los excluye por no
// llevar supervisorId en el payload).
const SUPERVISOR_ACTIVITY_CATEGORIES: ActivityCategory[] = ["projects", "tasks"];

type CategoryFilter = "all" | ActivityCategory;
type SubFilter = ActivityEventType | "all";
type SortOrder = "newest" | "oldest";

const SORT_ORDER_LABEL: Record<SortOrder, string> = {
  newest: "Más recientes primero",
  oldest: "Más antiguas primero",
};

/** Mismo feed que /admin/activity, acotado a los proyectos y tareas de
 * este supervisor (issue #134) — ver GET /supervisor/activity. */
export function SupervisorActivity() {
  const [events, setEvents] = useState<AdminActivityEventDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setSubFilter("all");
  }, [category]);

  useEffect(() => {
    setPage(1);
  }, [category, subFilter, sortOrder]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const activeTypes = useMemo<ActivityEventType[] | undefined>(
    () => (category === "all" ? undefined : subFilter === "all" ? ACTIVITY_CATEGORIES[category].types : [subFilter]),
    [category, subFilter],
  );

  const load = useCallback(() => {
    fetchTeamActivity({ types: activeTypes, sortOrder, page, pageSize })
      .then((result) => {
        setEvents(result.items);
        setTotal(result.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la actividad"));
  }, [activeTypes, sortOrder, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    setError(null);
    setIsExporting(true);
    try {
      await exportTeamActivityCsv({ types: activeTypes, sortOrder });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo exportar la actividad");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Actividad</h2>
        <div className="row-actions">
          <button type="button" className="secondary" onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}>
            Ordenar: {SORT_ORDER_LABEL[sortOrder]}
          </button>
          <button type="button" className="secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exportando…" : "Exportar CSV"}
          </button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h3>Actividad de tu equipo</h3>
        {!events && !error && <p>Cargando…</p>}

        <div className="filter-bar">
          <button
            type="button"
            className={category === "all" ? undefined : "secondary"}
            onClick={() => setCategory("all")}
          >
            Todo
          </button>
          {SUPERVISOR_ACTIVITY_CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              className={category === key ? undefined : "secondary"}
              onClick={() => setCategory(key)}
            >
              {ACTIVITY_CATEGORIES[key].label}
            </button>
          ))}
        </div>

        {category !== "all" && (
          <div className="filter-bar">
            <button
              type="button"
              className={subFilter === "all" ? undefined : "secondary"}
              onClick={() => setSubFilter("all")}
            >
              Todos
            </button>
            {ACTIVITY_CATEGORIES[category].types.map((t) => (
              <button
                key={t}
                type="button"
                className={subFilter === t ? undefined : "secondary"}
                onClick={() => setSubFilter(t)}
              >
                {ACTIVITY_EVENT_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        )}

        {events && events.length === 0 && <p>Todavía no hay actividad de tu equipo que mostrar.</p>}

        {events && events.length > 0 && (
          <ul className="activity-list">
            {events.map((event, index) => {
              const Icon = activityIcon(event.type);
              return (
                <li key={`${event.type}-${event.occurredAt}-${index}`} className="activity-list__item">
                  <span className="activity-list__message">
                    <Icon />
                    {activityMessage(event)}
                  </span>
                  <span className="activity-list__time">{formatRelativeTime(event.occurredAt)}</span>
                </li>
              );
            })}
          </ul>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
