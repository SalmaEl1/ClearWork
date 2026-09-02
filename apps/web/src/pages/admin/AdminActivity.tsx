import type { ActivityEventType, AdminActivityEventDTO } from "@clearwork/shared";
import { ACTIVITY_EVENT_TYPES } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchAdminActivity } from "../../api/admin.js";
import { Pagination } from "../../components/Pagination.js";
import { ACTIVITY_EVENT_TYPE_LABEL } from "../../constants.js";
import { activityIcon, activityMessage, formatRelativeTime } from "../../lib/activity.js";

const DEFAULT_PAGE_SIZE = 10;

type TypeFilter = ActivityEventType | "all";

export function AdminActivity() {
  const [events, setEvents] = useState<AdminActivityEventDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const load = useCallback(() => {
    fetchAdminActivity({
      type: typeFilter === "all" ? undefined : typeFilter,
      page,
      pageSize,
    })
      .then((result) => {
        setEvents(result.items);
        setTotal(result.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la actividad"));
  }, [typeFilter, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Actividad</h2>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h3>Todos los eventos</h3>
        {!events && !error && <p>Cargando…</p>}

        <div className="filter-bar">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="all">Todos los tipos</option>
            {ACTIVITY_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_EVENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

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
