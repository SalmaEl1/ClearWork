import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorCalendar } from "../../src/pages/supervisor/SupervisorCalendar.js";

const fetchSupervisorDashboard = vi.hoisted(() => vi.fn());
const fetchHolidays = vi.hoisted(() => vi.fn());
const fetchTeamLeaves = vi.hoisted(() => vi.fn());
const fetchTeamScheduledAbsences = vi.hoisted(() => vi.fn());
const fetchTeamVacationRequests = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/dashboard.js", () => ({ fetchSupervisorDashboard }));
vi.mock("../../src/api/holidays.js", () => ({ fetchHolidays }));
vi.mock("../../src/api/leaves.js", () => ({ fetchTeamLeaves }));
vi.mock("../../src/api/scheduledAbsences.js", () => ({ fetchTeamScheduledAbsences }));
vi.mock("../../src/api/vacations.js", () => ({ fetchTeamVacationRequests }));

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dashboard(team: Array<{ id: string; fullName: string }> = []) {
  return { weekStart: "2026-01-01", weekEnd: "2026-01-07", team, projects: [] };
}

describe("SupervisorCalendar", () => {
  beforeEach(() => {
    fetchSupervisorDashboard.mockReset().mockResolvedValue(dashboard([{ id: "u1", fullName: "Ana Worker" }]));
    fetchHolidays.mockReset().mockResolvedValue([]);
    fetchTeamLeaves.mockReset().mockResolvedValue([]);
    fetchTeamScheduledAbsences.mockReset().mockResolvedValue([]);
    fetchTeamVacationRequests.mockReset().mockResolvedValue([]);
  });

  it("muestra la leyenda de colores y el desplegable de personas", async () => {
    render(<SupervisorCalendar />);
    expect(await screen.findByText("Baja/permiso")).toBeInTheDocument();
    expect(screen.getByText("Vacaciones")).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Ana Worker" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Todo el equipo" })).toBeInTheDocument();
  });

  it("lista una baja/permiso del equipo en el mes en curso, con el nombre de quien la tiene", async () => {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    fetchTeamLeaves.mockResolvedValue([
      {
        id: "l1",
        userId: "u1",
        userFullName: "Ana Worker",
        type: "sick_leave",
        startDate: startOfMonth,
        endDate: null,
        createdBy: "s1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    render(<SupervisorCalendar />);

    expect(await screen.findByText("Ana Worker — Baja/permiso: Enfermedad")).toBeInTheDocument();
  });

  it("filtrar por una persona concreta acota la lista de eventos a ella", async () => {
    const now = new Date();
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-10`;
    fetchSupervisorDashboard.mockResolvedValue(
      dashboard([
        { id: "u1", fullName: "Ana Worker" },
        { id: "u2", fullName: "Luis Worker" },
      ]),
    );
    fetchTeamScheduledAbsences.mockResolvedValue([
      { id: "a1", userId: "u1", userFullName: "Ana Worker", date: day, startTime: "10:00", endTime: "11:00", reason: "Cita médica", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "a2", userId: "u2", userFullName: "Luis Worker", date: day, startTime: "09:00", endTime: "09:30", reason: "Gestión legal", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const user = userEvent.setup();
    render(<SupervisorCalendar />);
    await screen.findByText("Ana Worker — Ausencia puntual: Cita médica");
    expect(screen.getByText("Luis Worker — Ausencia puntual: Gestión legal")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Persona"), "u1");

    expect(screen.getByText("Ana Worker — Ausencia puntual: Cita médica")).toBeInTheDocument();
    expect(screen.queryByText("Luis Worker — Ausencia puntual: Gestión legal")).not.toBeInTheDocument();
  });
});
