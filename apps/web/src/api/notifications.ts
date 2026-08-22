import type { NotificationDTO, Paginated } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchNotifications(page = 1, pageSize = 20): Promise<Paginated<NotificationDTO>> {
  return apiFetch<Paginated<NotificationDTO>>(`/notifications?page=${page}&pageSize=${pageSize}`);
}

export function fetchUnreadNotificationCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: string): Promise<NotificationDTO> {
  return apiFetch<NotificationDTO>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>("/notifications/read-all", { method: "POST" });
}
