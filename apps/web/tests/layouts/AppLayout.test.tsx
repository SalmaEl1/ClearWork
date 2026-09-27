import type { PublicUser, Role } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "../../src/layouts/AppLayout.js";

let currentUser: PublicUser | null;

vi.mock("../../src/auth/AuthContext.js", () => ({
  useAuth: () => ({ user: currentUser }),
}));

vi.mock("../../src/components/NotificationBell.js", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

function user(role: Role): PublicUser {
  return {
    id: "u1",
    email: "juan@clearwork.test",
    fullName: "Juan Worker",
    role,
    weeklyTargetHours: 40,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    hireDate: "2026-01-01",
    contractType: "full_time",
  };
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Contenido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  it("muestra el enlace a la marca y el contenido de la ruta anidada", () => {
    currentUser = user("worker");
    renderLayout();
    expect(screen.getByRole("link", { name: "ClearWork" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("admin: muestra solo los enlaces de administración", () => {
    currentUser = user("admin");
    renderLayout();

    expect(screen.getByRole("link", { name: /Panel/ })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: /Usuarios/ })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: /Proyectos/ })).toHaveAttribute("href", "/admin/projects");
    expect(screen.getByRole("link", { name: /Actividad/ })).toHaveAttribute("href", "/admin/activity");
    expect(screen.getByRole("link", { name: /Ajustes/ })).toHaveAttribute("href", "/admin/settings");
    expect(screen.getByRole("link", { name: /Documentos/ })).toHaveAttribute("href", "/admin/documents");

    expect(screen.queryByRole("link", { name: /Fichaje/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Equipo/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument();
  });

  it("worker: muestra solo los enlaces de trabajador y la campana de notificaciones", () => {
    currentUser = user("worker");
    renderLayout();

    expect(screen.getByRole("link", { name: /Fichaje/ })).toHaveAttribute("href", "/worker");
    expect(screen.getByRole("link", { name: /Historial de fichaje/ })).toHaveAttribute("href", "/worker/history");
    expect(screen.getByRole("link", { name: /Tareas/ })).toHaveAttribute("href", "/worker/tasks");
    expect(screen.getByRole("link", { name: /Mi proyecto/ })).toHaveAttribute("href", "/worker/project");
    expect(screen.getByRole("link", { name: /Vacaciones/ })).toHaveAttribute("href", "/worker/vacations");
    expect(screen.getByRole("link", { name: /Ausencias/ })).toHaveAttribute("href", "/worker/absences");
    expect(screen.getByRole("link", { name: /Calendario/ })).toHaveAttribute("href", "/worker/calendar");
    expect(screen.getByRole("link", { name: /Reservar sitio/ })).toHaveAttribute("href", "/worker/seat");
    expect(screen.getByRole("link", { name: /Documentos/ })).toHaveAttribute("href", "/worker/documents");

    expect(screen.queryByRole("link", { name: /Usuarios/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Panel$/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });

  it("supervisor: muestra solo los enlaces de supervisor y la campana de notificaciones", () => {
    currentUser = user("supervisor");
    renderLayout();

    expect(screen.getByRole("link", { name: /Panel/ })).toHaveAttribute("href", "/supervisor");
    expect(screen.getByRole("link", { name: /Tareas/ })).toHaveAttribute("href", "/supervisor/tasks");
    expect(screen.getByRole("link", { name: /Equipo/ })).toHaveAttribute("href", "/supervisor/team");
    expect(screen.getByRole("link", { name: /Mi proyecto/ })).toHaveAttribute("href", "/supervisor/projects");
    expect(screen.getByRole("link", { name: /Vacaciones/ })).toHaveAttribute("href", "/supervisor/vacations");
    expect(screen.getByRole("link", { name: /Ausencias/ })).toHaveAttribute("href", "/supervisor/absences");
    expect(screen.getByRole("link", { name: /Calendario/ })).toHaveAttribute("href", "/supervisor/calendar");
    expect(screen.getByRole("link", { name: /Actividad/ })).toHaveAttribute("href", "/supervisor/activity");
    expect(screen.getByRole("link", { name: /Documentos/ })).toHaveAttribute("href", "/supervisor/documents");

    expect(screen.queryByRole("link", { name: /Fichaje/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Usuarios/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });

  it("no muestra ningún bloque de navegación por rol cuando no hay usuario", () => {
    currentUser = null;
    renderLayout();

    expect(screen.queryByRole("link", { name: /Panel/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Fichaje/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument();
  });
});
