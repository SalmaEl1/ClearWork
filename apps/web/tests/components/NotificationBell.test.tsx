import type { NotificationDTO, Paginated } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "../../src/components/NotificationBell.js";

const fetchNotifications = vi.hoisted(() => vi.fn());
const fetchUnreadNotificationCount = vi.hoisted(() => vi.fn());
const markNotificationRead = vi.hoisted(() => vi.fn());
const markAllNotificationsRead = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/notifications.js", () => ({
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
}));

function page(items: NotificationDTO[]): Paginated<NotificationDTO> {
  return { items, total: items.length, page: 1, pageSize: 20 };
}

const assigned: NotificationDTO = {
  id: "n1",
  type: "task_assigned",
  taskId: "t1",
  taskTitle: "Diseñar login",
  projectName: "Web",
  readAt: null,
  createdAt: new Date().toISOString(),
};

const memberAdded: NotificationDTO = {
  id: "n2",
  type: "project_member_added",
  projectName: "Web",
  readAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

function renderBell() {
  return render(<NotificationBell />);
}

describe("NotificationBell", () => {
  beforeEach(() => {
    fetchNotifications.mockReset().mockResolvedValue(page([assigned, memberAdded]));
    fetchUnreadNotificationCount.mockReset().mockResolvedValue({ count: 1 });
    markNotificationRead.mockReset().mockResolvedValue(assigned);
    markAllNotificationsRead.mockReset().mockResolvedValue(undefined);
  });

  it("pide el contador de no leídas al montar y lo muestra como badge", async () => {
    renderBell();
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("no muestra badge cuando no hay notificaciones sin leer", async () => {
    fetchUnreadNotificationCount.mockResolvedValue({ count: 0 });
    renderBell();
    await waitFor(() => expect(fetchUnreadNotificationCount).toHaveBeenCalled());
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("al abrir la campana pide y muestra la lista de notificaciones", async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole("button", { name: "Notificaciones" }));

    expect(await screen.findByText(/Se le ha asignado la tarea/)).toBeInTheDocument();
    expect(screen.getByText(/Se le ha incorporado al proyecto/)).toBeInTheDocument();
  });

  it("al hacer clic en una notificación sin leer, solo la marca como leída (no navega a ningún sitio)", async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole("button", { name: "Notificaciones" }));
    const item = await screen.findByText(/Se le ha asignado la tarea/);
    await user.click(item);

    expect(markNotificationRead).toHaveBeenCalledWith("n1");
    // El desplegable sigue abierto y la notificación sigue en la lista,
    // solo que ya no cuenta como no leída.
    expect(screen.getByText(/Se le ha asignado la tarea/)).toBeInTheDocument();
    expect(item.closest("button")).not.toHaveClass("notification-bell__item--unread");
  });

  it("hacer clic en una notificación ya leída no vuelve a llamar a la API", async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole("button", { name: "Notificaciones" }));
    await user.click(await screen.findByText(/Se le ha incorporado al proyecto/));

    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("'Marcar todo como leído' limpia el badge y llama a la API", async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole("button", { name: "Notificaciones" }));
    await user.click(await screen.findByText("Marcar todo como leído"));

    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Marcar todo como leído")).not.toBeInTheDocument());
  });
});
