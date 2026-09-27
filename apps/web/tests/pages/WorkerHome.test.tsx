import type { PublicUser, WorkerDashboardResponse, WorkSessionDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { WorkerHome } from "../../src/pages/worker/WorkerHome.js";

const fetchWorkerDashboard = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());
const fetchActiveSession = vi.hoisted(() => vi.fn());
const clockIn = vi.hoisted(() => vi.fn());
const clockOut = vi.hoisted(() => vi.fn());
const startBreak = vi.hoisted(() => vi.fn());
const endBreak = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/dashboard.js", () => ({ fetchWorkerDashboard }));
vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));
vi.mock("../../src/api/workSessions.js", () => ({
  fetchActiveSession,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
}));

const worker: PublicUser = {
  id: "u1",
  email: "worker@test.dev",
  fullName: "Juan Worker",
  role: "worker",
  weeklyTargetHours: 40,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  hireDate: "2026-01-01",
  contractType: "full_time",
};

function dashboard(overrides: Partial<WorkerDashboardResponse> = {}): WorkerDashboardResponse {
  return {
    weekStart: "2026-01-05T00:00:00.000Z",
    weekEnd: "2026-01-12T00:00:00.000Z",
    targetHours: 40,
    workedHours: 20,
    status: "ok",
    isClockedIn: false,
    isOnBreak: false,
    ...overrides,
  };
}

function workSession(overrides: Partial<WorkSessionDTO> = {}): WorkSessionDTO {
  return {
    id: "s1",
    userId: "u1",
    startedAt: "2026-01-05T09:00:00.000Z",
    endedAt: null,
    workedMinutes: 30,
    breaks: [],
    ...overrides,
  };
}

describe("WorkerHome", () => {
  beforeEach(() => {
    useAuth.mockReset().mockReturnValue({ user: worker });
    fetchWorkerDashboard.mockReset().mockResolvedValue(dashboard());
    fetchActiveSession.mockReset().mockResolvedValue({ activeSession: null });
    clockIn.mockReset().mockResolvedValue(workSession());
    clockOut.mockReset().mockResolvedValue(workSession({ endedAt: "2026-01-05T17:00:00.000Z" }));
    startBreak.mockReset().mockResolvedValue(workSession());
    endBreak.mockReset().mockResolvedValue(workSession());
  });

  it("saluda al trabajador autenticado y carga el dashboard de la semana actual", async () => {
    render(<WorkerHome />);
    expect(await screen.findByText("Hola, Juan Worker")).toBeInTheDocument();
    expect(fetchWorkerDashboard).toHaveBeenCalledWith(0);
  });

  it("muestra el widget de fichaje en la semana actual", async () => {
    render(<WorkerHome />);
    expect(await screen.findByText("No has fichado entrada todavía.")).toBeInTheDocument();
  });

  it("muestra las horas trabajadas cuando llega el dashboard", async () => {
    render(<WorkerHome />);
    expect(await screen.findByText("Horas esta semana")).toBeInTheDocument();
    expect(screen.getByText(/20\.0 h/)).toBeInTheDocument();
  });

  it("al ir a la semana anterior deja de mostrar el widget de fichaje y pide el dashboard de esa semana", async () => {
    const user = userEvent.setup();
    render(<WorkerHome />);
    await screen.findByText("Horas esta semana");

    await user.click(screen.getByRole("button", { name: "← Semana anterior" }));

    await waitFor(() => expect(fetchWorkerDashboard).toHaveBeenLastCalledWith(-1));
    expect(screen.queryByText("No has fichado entrada todavía.")).not.toBeInTheDocument();
  });

  it("recarga el dashboard cuando cambia la sesión de fichaje", async () => {
    const user = userEvent.setup();
    render(<WorkerHome />);
    await screen.findByText("No has fichado entrada todavía.");

    await user.click(screen.getByRole("button", { name: "Fichar entrada" }));

    await waitFor(() => expect(fetchWorkerDashboard).toHaveBeenCalledTimes(2));
  });

  it("muestra el mensaje de error que devuelve la API si falla la carga del dashboard", async () => {
    fetchWorkerDashboard.mockRejectedValue(new ApiError("Dashboard no disponible", 500));
    render(<WorkerHome />);
    expect(await screen.findByText("Dashboard no disponible")).toBeInTheDocument();
  });

  it("muestra un mensaje genérico si el fallo de carga no viene de la API", async () => {
    fetchWorkerDashboard.mockRejectedValue(new Error("network down"));
    render(<WorkerHome />);
    expect(await screen.findByText("No se pudo cargar el dashboard")).toBeInTheDocument();
  });
});
