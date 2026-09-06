import type { ActivityEventType, AdminActivityEventDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchAdminActivity } from "../../api/admin.js";
import { Pagination } from "../../components/Pagination.js";
import type { ActivityCategory } from "../../constants.js";
import { ACTIVITY_CATEGORIES, ACTIVITY_EVENT_TYPE_LABEL } from "../../constants.js";
import { activityIcon, activityMessage, formatRelativeTime } from "../../lib/activity.js";

const DEFAULT_PAGE_SIZE = 10;

type CategoryFilter = "all" | ActivityCategory;
type SubFilter = ActivityEventType | "all";
type SortOrder = "newest" | "oldest";

const SORT_ORDER_LABEL: Record<SortOrder, string> = {
  newest: "Más recientes primero",
  oldest: "Más antiguas primero",
};

export function AdminActivity() {
  const [events, setEvents] = useState<AdminActivityEventDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Cambiar de categoría invalida el sub-filtro de la anterior: "Cambios
  // de rol" no significa nada dentro de "Proyectos".
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

  const load = useCallback(() => {
    // "Todo" -> sin filtrar. Una categoría con su sub-filtro en "all" ->
    // todos los tipos de esa categoría a la vez. Un sub-filtro concreto
    // -> solo ese tipo.
    const types: ActivityEventType[] | undefined =
      category === "all"
        ? undefined
        : subFilter === "all"
          ? ACTIVITY_CATEGORIES[category].types
          : [subFilter];

    fetchAdminActivity({ types, sortOrder, page, pageSize })
      .then((result) => {
        setEvents(result.items);
        setTotal(result.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la actividad"));
  }, [category, subFilter, sortOrder, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Actividad</h2>
        <button type="button" className="secondary" onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}>
          Ordenar: {SORT_ORDER_LABEL[sortOrder]}
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h3>Todos los eventos</h3>
        {!events && !error && <p>Cargando…</p>}

        <div className="filter-bar">
          <button
            type="button"
            className={category === "all" ? undefined : "secondary"}
            onClick={() => setCategory("all")}
          >
            Todo
          </button>
          {(Object.keys(ACTIVITY_CATEGORIES) as ActivityCategory[]).map((key) => (
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

        {events && events.length === 0 && <p>Todavía no hay actividad que mostrar.</p>}

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
