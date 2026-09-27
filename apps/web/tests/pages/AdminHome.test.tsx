import type { AdminActivityEventDTO, AdminUserSummary, ProjectDTO, PublicUser } from "@clearwork/shared";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminHome } from "../../src/pages/admin/AdminHome.js";

const fetchAdminActivity = vi.hoisted(() => vi.fn());
const fetchAllAdminProjects = vi.hoisted(() => vi.fn());
const fetchAllAdminUsers = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/admin.js", () => ({
  fetchAdminActivity,
  fetchAllAdminProjects,
  fetchAllAdminUsers,
}));
vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

const admin: PublicUser = {
  id: "a1",
  email: "admin@test.dev",
  fullName: "Ada Admin",
  role: "admin",
  weeklyTargetHours: 40,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  hireDate: "2026-01-01",
  contractType: "full_time",
};

function makeUser(overrides: Partial<AdminUserSummary> = {}): AdminUserSummary {
  return {
    id: "u1",
    email: "u1@test.dev",
    fullName: "Usuario",
    role: "worker",
    isActive: true,
    weeklyTargetHours: 40,
    hireDate: "2026-01-01",
    contractType: "full_time",
    currentProjectId: null,
    currentProjectName: null,
    supervisedProjects: [],
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: "p1",
    name: "Proyecto A",
    description: null,
    supervisorId: "s1",
    isArchived: false,
    clientName: "Cliente A",
    clientContact: "cliente@test.dev",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function page(items: AdminActivityEventDTO[] = []) {
  return { items, total: items.length, page: 1, pageSize: 5 };
}

const sampleEvent: AdminActivityEventDTO = {
  type: "user_created",
  occurredAt: "2026-01-01T10:00:00.000Z",
  userName: "Ana",
  role: "worker",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminHome />
    </MemoryRouter>,
  );
}

describe("AdminHome", () => {
  beforeEach(() => {
    useAuth.mockReset().mockReturnValue({ user: admin });
    fetchAllAdminUsers.mockReset().mockResolvedValue([
      makeUser({ id: "u1", role: "worker" }),
      makeUser({ id: "u2", role: "supervisor" }),
      makeUser({ id: "u3", role: "admin" }),
    ]);
    fetchAllAdminProjects.mockReset().mockResolvedValue([
      makeProject({ id: "p1", isArchived: false }),
      makeProject({ id: "p2", isArchived: true }),
    ]);
    fetchAdminActivity.mockReset().mockResolvedValue(page([sampleEvent]));
  });

  it("saluda al admin autenticado", async () => {
    renderPage();
    expect(await screen.findByText("Hola, Ada Admin")).toBeInTheDocument();
  });

  it("muestra 'Cargando…' mientras llegan los datos", () => {
    renderPage();
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("calcula y muestra el resumen de cuentas y proyectos", async () => {
    renderPage();
    expect(await screen.findByText("Supervisores")).toBeInTheDocument();

    const statGrid = screen.getByText("Supervisores").closest(".stat-grid") as HTMLElement;
    expect(within(statGrid).getByText("Supervisores").closest(".stat-tile")).toHaveTextContent("1");
    expect(within(statGrid).getByText("Trabajadores").closest(".stat-tile")).toHaveTextContent("1");
    expect(within(statGrid).getByText("Administradores").closest(".stat-tile")).toHaveTextContent("1");
    expect(within(statGrid).getByText("Proyectos").closest(".stat-tile")).toHaveTextContent("2");
    expect(within(statGrid).getByText("Proyectos archivados").closest(".stat-tile")).toHaveTextContent("1");
  });

  it("pide como mucho 5 eventos de actividad reciente", async () => {
    renderPage();
    await screen.findByText("Supervisores");
    expect(fetchAdminActivity).toHaveBeenCalledWith({ pageSize: 5 });
  });

  it("muestra la actividad reciente cuando hay eventos", async () => {
    renderPage();
    expect(await screen.findByText("Actividad reciente")).toBeInTheDocument();
    expect(await screen.findByText(/Ana/)).toBeInTheDocument();
  });

  it("indica que no hay actividad si la lista viene vacía", async () => {
    fetchAdminActivity.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText("Todavía no hay actividad que mostrar.")).toBeInTheDocument();
  });

  it("enlaza a la actividad completa, a usuarios y a proyectos", async () => {
    renderPage();
    await screen.findByText("Actividad reciente");
    expect(screen.getByRole("link", { name: "Ver toda la actividad →" })).toHaveAttribute(
      "href",
      "/admin/activity",
    );
    expect(screen.getByRole("link", { name: /Usuarios/ })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: /Proyectos/ })).toHaveAttribute("href", "/admin/projects");
  });

  it("muestra un aviso de error si falla la carga del resumen", async () => {
    fetchAllAdminUsers.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar el resumen")).toBeInTheDocument();
  });
});
