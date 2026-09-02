import type {
  NotificationChannel,
  NotificationPreferenceDTO,
  NotificationType,
} from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchNotificationPreferences(): Promise<NotificationPreferenceDTO[]> {
  return apiFetch<NotificationPreferenceDTO[]>("/notification-preferences");
}

export function updateNotificationPreference(
  type: NotificationType,
  channel: NotificationChannel,
): Promise<NotificationPreferenceDTO> {
  return apiFetch<NotificationPreferenceDTO>(`/notification-preferences/${type}`, {
    method: "PATCH",
    body: { channel },
  });
}
