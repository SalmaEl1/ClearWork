import type { PublicUser, SupervisorDashboardResponse } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { SupervisorHome } from "../../src/pages/supervisor/SupervisorHome.js";

const fetchSupervisorDashboard = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/dashboard.js", () => ({ fetchSupervisorDashboard }));
vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

const supervisor: PublicUser = {
  id: "s1",
  email: "supervisor@test.dev",
  fullName: "Ana Supervisor",
  role: "supervisor",
  weeklyTargetHours: 40,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  hireDate: "2026-01-01",
  contractType: "full_time",
};

function dashboard(overrides: Partial<SupervisorDashboardResponse> = {}): SupervisorDashboardResponse {
  return {
    weekStart: "2026-01-05T00:00:00.000Z",
    weekEnd: "2026-01-12T00:00:00.000Z",
    team: [
      {
        id: "u1",
        fullName: "Juan Worker",
        status: "working",
        breakType: null,
        leaveType: null,
        leaveId: null,
        scheduledAbsenceReason: null,
        hoursThisWeek: 12.5,
        vacationBalance: { year: 2026, total: 23, used: 0, remaining: 23 },
      },
    ],
    projects: [{ projectId: "p1", projectName: "Proyecto Web", pending: 1, inProgress: 2, done: 3 }],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SupervisorHome />
    </MemoryRouter>,
  );
}

describe("SupervisorHome", () => {
  beforeEach(() => {
    useAuth.mockReset().mockReturnValue({ user: supervisor });
    fetchSupervisorDashboard.mockReset().mockResolvedValue(dashboard());
  });

  it("saluda al supervisor autenticado y carga el dashboard de la semana actual", async () => {
    renderPage();
    expect(await screen.findByText("Hola, Ana Supervisor")).toBeInTheDocument();
    expect(fetchSupervisorDashboard).toHaveBeenCalledWith(0);
  });

  it("muestra el estado del equipo cuando llega el dashboard", async () => {
    renderPage();
    expect(await screen.findByText("Juan Worker")).toBeInTheDocument();
    expect(screen.getByText("Trabajando")).toBeInTheDocument();
  });

  it("muestra el progreso de los proyectos cuando llega el dashboard", async () => {
    renderPage();
    expect(await screen.findByText("Proyecto Web")).toBeInTheDocument();
    expect(screen.getByText("6 tareas")).toBeInTheDocument();
  });

  it("no muestra nada del dashboard mientras no ha llegado la respuesta", () => {
    renderPage();
    expect(screen.queryByText("Juan Worker")).not.toBeInTheDocument();
    expect(screen.queryByText("Proyecto Web")).not.toBeInTheDocument();
  });

  it("al ir a la semana anterior pide el dashboard de esa semana", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "← Semana anterior" }));

    await waitFor(() => expect(fetchSupervisorDashboard).toHaveBeenLastCalledWith(-1));
  });

  it("muestra el mensaje de error que devuelve la API si falla la carga del dashboard", async () => {
    fetchSupervisorDashboard.mockRejectedValue(new ApiError("Dashboard no disponible", 500));
    renderPage();
    expect(await screen.findByText("Dashboard no disponible")).toBeInTheDocument();
  });

  it("muestra un mensaje genérico si el fallo de carga no viene de la API", async () => {
    fetchSupervisorDashboard.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar el dashboard")).toBeInTheDocument();
  });
});
