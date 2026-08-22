import type { NotificationDTO, Paginated } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "../../src/components/NotificationBell.js";

const fetchNotifications = vi.hoisted(() => vi.fn());
const fetchUnreadNotificationCount = vi.hoisted(() => vi.fn());
const markNotificationRead = vi.hoisted(() => vi.fn());
const markAllNotificationsRead = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/notifications.js", () => ({
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

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
  return render(
    <MemoryRouter>
      <NotificationBell role="worker" />
    </MemoryRouter>,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    fetchNotifications.mockReset().mockResolvedValue(page([assigned, memberAdded]));
    fetchUnreadNotificationCount.mockReset().mockResolvedValue({ count: 1 });
    markNotificationRead.mockReset().mockResolvedValue(assigned);
    markAllNotificationsRead.mockReset().mockResolvedValue(undefined);
    navigate.mockReset();
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

    expect(await screen.findByText(/Se te ha asignado la tarea/)).toBeInTheDocument();
    expect(screen.getByText(/Te han incorporado al proyecto/)).toBeInTheDocument();
  });

  it("al hacer clic en una notificación sin leer, la marca como leída y navega a su enlace", async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole("button", { name: "Notificaciones" }));
    await user.click(await screen.findByText(/Se te ha asignado la tarea/));

    expect(markNotificationRead).toHaveBeenCalledWith("n1");
    expect(navigate).toHaveBeenCalledWith("/worker/tasks/t1");
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
