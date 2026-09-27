import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
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

function isoInMonth(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(day)}`;
}

function isoNextMonth(day: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoPrevMonth(day: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, day);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

  it("muestra el mensaje de un ApiError cuando fallan las cargas del calendario del equipo", async () => {
    fetchSupervisorDashboard.mockRejectedValue(new ApiError("Error equipo", 500));
    fetchTeamLeaves.mockRejectedValue(new ApiError("Error bajas", 500));
    fetchTeamScheduledAbsences.mockRejectedValue(new ApiError("Error ausencias", 500));
    fetchTeamVacationRequests.mockRejectedValue(new ApiError("Error vacaciones", 500));
    fetchHolidays.mockRejectedValue(new ApiError("Error festivos", 500));

    render(<SupervisorCalendar />);

    expect(await screen.findByText("Error festivos")).toBeInTheDocument();
  });

  it("usa mensajes genéricos cuando los errores de carga no son ApiError", async () => {
    fetchSupervisorDashboard.mockRejectedValue(new Error("boom"));
    fetchTeamLeaves.mockRejectedValue(new Error("boom"));
    fetchTeamScheduledAbsences.mockRejectedValue(new Error("boom"));
    fetchTeamVacationRequests.mockRejectedValue(new Error("boom"));
    fetchHolidays.mockRejectedValue(new Error("boom"));

    render(<SupervisorCalendar />);

    expect(await screen.findByText("No se pudieron cargar los festivos")).toBeInTheDocument();
  });

  it("marca un festivo del mes en curso y lo omite si es de otro mes", async () => {
    const inRange = { id: "h1", date: isoInMonth(15), label: "Día festivo", isNational: true };
    const outOfRange = { id: "h2", date: isoNextMonth(5), label: "Otro festivo", isNational: true };
    fetchHolidays.mockResolvedValue([inRange, outOfRange]);

    render(<SupervisorCalendar />);

    expect(await screen.findByTitle("Festivo: Día festivo")).toBeInTheDocument();
    expect(await screen.findByText("Festivo: Día festivo")).toBeInTheDocument();
    expect(screen.queryByText("Festivo: Otro festivo")).not.toBeInTheDocument();
  });

  it("calcula el rango de una baja de varios días y omite las de fuera del mes", async () => {
    const multiDay = {
      id: "l1", userId: "u1", userFullName: "Ana Worker", type: "sick_leave" as const,
      startDate: isoInMonth(5), endDate: isoInMonth(10), createdBy: "s1", createdAt: "2026-01-01T00:00:00.000Z",
    };
    const singleDay = {
      id: "l2", userId: "u1", userFullName: "Ana Worker", type: "sick_leave" as const,
      startDate: isoInMonth(20), endDate: isoInMonth(20), createdBy: "s1", createdAt: "2026-01-01T00:00:00.000Z",
    };
    const outOfRange = {
      id: "l3", userId: "u1", userFullName: "Ana Worker", type: "sick_leave" as const,
      startDate: isoPrevMonth(5), endDate: isoPrevMonth(10), createdBy: "s1", createdAt: "2026-01-01T00:00:00.000Z",
    };
    fetchTeamLeaves.mockResolvedValue([multiDay, singleDay, outOfRange]);

    render(<SupervisorCalendar />);

    expect(await screen.findByText(`${isoInMonth(5)} – ${isoInMonth(10)}`)).toBeInTheDocument();
    expect(screen.getByText(isoInMonth(20))).toBeInTheDocument();
    expect(screen.queryByText(`${isoPrevMonth(5)} – ${isoPrevMonth(10)}`)).not.toBeInTheDocument();
  });

  it("gestiona vacaciones aprobadas, rechazadas, canceladas y fuera de mes", async () => {
    const approvedMulti = {
      id: "v1", userId: "u1", userFullName: "Ana Worker", startDate: isoInMonth(3), endDate: isoInMonth(8),
      status: "approved" as const, decidedBy: "s1", decidedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const approvedSingle = {
      id: "v2", userId: "u1", userFullName: "Ana Worker", startDate: isoInMonth(20), endDate: isoInMonth(20),
      status: "approved" as const, decidedBy: "s1", decidedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const rejected = {
      id: "v3", userId: "u1", userFullName: "Ana Worker", startDate: isoInMonth(12), endDate: isoInMonth(12),
      status: "rejected" as const, decidedBy: "s1", decidedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const cancelled = {
      id: "v4", userId: "u1", userFullName: "Ana Worker", startDate: isoInMonth(15), endDate: isoInMonth(15),
      status: "cancelled" as const, decidedBy: null, decidedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const outOfRange = {
      id: "v5", userId: "u1", userFullName: "Ana Worker", startDate: isoNextMonth(3), endDate: isoNextMonth(8),
      status: "approved" as const, decidedBy: "s1", decidedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    fetchTeamVacationRequests.mockResolvedValue([approvedMulti, approvedSingle, rejected, cancelled, outOfRange]);

    render(<SupervisorCalendar />);

    expect(await screen.findByText(`${isoInMonth(3)} – ${isoInMonth(8)}`)).toBeInTheDocument();
    expect(screen.getByText(isoInMonth(20))).toBeInTheDocument();
    expect(screen.queryByText(isoInMonth(12))).not.toBeInTheDocument();
    expect(screen.queryByText(isoInMonth(15))).not.toBeInTheDocument();
    expect(screen.queryByText(`${isoNextMonth(3)} – ${isoNextMonth(8)}`)).not.toBeInTheDocument();
    expect((await screen.findAllByTitle(/Vacaciones \(Aprobada\)/)).length).toBeGreaterThan(0);
  });

  it("incluye ausencias puntuales del mes en la lista de eventos y omite las de otros meses", async () => {
    const inRange = {
      id: "a1", userId: "u1", userFullName: "Ana Worker", date: isoInMonth(12),
      startTime: "10:00", endTime: "11:00", reason: "Cita médica", createdAt: "2026-01-01T00:00:00.000Z",
    };
    const outOfRange = {
      id: "a2", userId: "u1", userFullName: "Ana Worker", date: isoNextMonth(5),
      startTime: "09:00", endTime: "09:30", reason: "Otra cita", createdAt: "2026-01-01T00:00:00.000Z",
    };
    fetchTeamScheduledAbsences.mockResolvedValue([inRange, outOfRange]);

    render(<SupervisorCalendar />);

    expect(await screen.findByText("Ana Worker — Ausencia puntual: Cita médica")).toBeInTheDocument();
    expect(screen.queryByText("Ana Worker — Ausencia puntual: Otra cita")).not.toBeInTheDocument();
  });

  it("cambia de mes al navegar hacia atrás", async () => {
    const user = userEvent.setup();
    render(<SupervisorCalendar />);
    await screen.findByLabelText("Mes anterior");

    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    await user.click(screen.getByLabelText("Mes anterior"));

    expect(await screen.findByText(`${monthNames[prev.getMonth()]} ${prev.getFullYear()}`)).toBeInTheDocument();
  });
});
