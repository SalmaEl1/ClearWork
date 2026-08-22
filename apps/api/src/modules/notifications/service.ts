import type { NotificationDTO, Paginated } from "@clearwork/shared";
import { NotFoundError } from "../../shared/errors.js";
import * as repo from "./repository.js";
import type { NotificationRow } from "./repository.js";

function toDTO(row: NotificationRow): NotificationDTO {
  return {
    id: row.id,
    readAt: row.read_at ? row.read_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    type: row.type,
    ...row.payload,
  } as NotificationDTO;
}

export async function listMyNotifications(
  userId: string,
  page: number,
  pageSize: number,
): Promise<Paginated<NotificationDTO>> {
  const { rows, total } = await repo.listNotificationsPage(userId, page, pageSize);
  return { items: rows.map(toDTO), total, page, pageSize };
}

export async function countMyUnread(userId: string): Promise<number> {
  return repo.countUnread(userId);
}

export async function markNotificationRead(id: string, userId: string): Promise<NotificationDTO> {
  const row = await repo.markAsRead(id, userId);
  if (!row) throw new NotFoundError("Notificación no encontrada");
  return toDTO(row);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await repo.markAllAsRead(userId);
}
