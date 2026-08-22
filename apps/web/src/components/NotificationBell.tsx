import type { NotificationDTO } from "@clearwork/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.js";
import { formatRelativeTime } from "../lib/activity.js";
import { notificationLink, notificationMessage } from "../lib/notifications.js";

const POLL_INTERVAL_MS = 30_000;

/**
 * Icono de la cabecera con el contador de no leídas, para trabajador y
 * supervisor (el admin ya tiene su propio feed de actividad en
 * /admin/activity). El contador se refresca solo cada 30s; la lista de
 * notificaciones se pide al abrir el desplegable, no antes.
 */
export function NotificationBell({ role }: { role: "worker" | "supervisor" }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDTO[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = useCallback(() => {
    fetchUnreadNotificationCount()
      .then(({ count }) => setUnreadCount(count))
      .catch(() => {
        // Best-effort: el badge no es crítico, no hace falta un banner de
        // error por un fallo puntual de refresco.
      });
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const loadNotifications = useCallback(() => {
    fetchNotifications()
      .then((page) => setNotifications(page.items))
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) loadNotifications();
  }

  async function handleItemClick(notification: NotificationDTO) {
    if (!notification.readAt) {
      setUnreadCount((count) => Math.max(0, count - 1));
      markNotificationRead(notification.id).catch(() => {
        // Best-effort: si falla, el peor caso es que siga apareciendo
        // como no leída — no hace falta bloquear la navegación por eso.
      });
    }
    const link = notificationLink(notification, role);
    setIsOpen(false);
    if (link) navigate(link);
  }

  async function handleMarkAllRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
    try {
      await markAllNotificationsRead();
    } catch {
      loadUnreadCount();
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label="Notificaciones"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-bell__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-bell__dropdown" role="menu">
          <div className="notification-bell__header">
            <strong>Notificaciones</strong>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead}>
                Marcar todo como leído
              </button>
            )}
          </div>

          {!notifications && <p className="notification-bell__empty">Cargando…</p>}
          {notifications && notifications.length === 0 && (
            <p className="notification-bell__empty">No tienes notificaciones.</p>
          )}
          {notifications?.map((n) => (
            <button
              key={n.id}
              type="button"
              role="menuitem"
              className={`notification-bell__item ${!n.readAt ? "notification-bell__item--unread" : ""}`}
              onClick={() => handleItemClick(n)}
            >
              {notificationMessage(n)}
              <span className="notification-bell__time">{formatRelativeTime(n.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
