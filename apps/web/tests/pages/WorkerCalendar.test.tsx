import type { PublicUser } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { WorkerCalendar } from "../../src/pages/worker/WorkerCalendar.js";

const fetchHolidays = vi.hoisted(() => vi.fn());
const fetchLeaves = vi.hoisted(() => vi.fn());
const fetchMyScheduledAbsences = vi.hoisted(() => vi.fn());
const fetchMyVacationRequests = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/holidays.js", () => ({ fetchHolidays }));
vi.mock("../../src/api/leaves.js", () => ({ fetchLeaves }));
vi.mock("../../src/api/scheduledAbsences.js", () => ({ fetchMyScheduledAbsences }));
vi.mock("../../src/api/vacations.js", () => ({ fetchMyVacationRequests }));
vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

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

describe("WorkerCalendar", () => {
  beforeEach(() => {
    useAuth.mockReset().mockReturnValue({ user: worker });
    fetchHolidays.mockReset().mockResolvedValue([]);
    fetchLeaves.mockReset().mockResolvedValue([]);
    fetchMyScheduledAbsences.mockReset().mockResolvedValue([]);
    fetchMyVacationRequests.mockReset().mockResolvedValue([]);
  });

  it("muestra la leyenda de colores", async () => {
    render(<WorkerCalendar />);
    expect(await screen.findByText("Baja/permiso")).toBeInTheDocument();
    expect(screen.getByText("Vacaciones")).toBeInTheDocument();
    expect(screen.getByText("Ausencia puntual")).toBeInTheDocument();
    expect(screen.getByText("Festivo")).toBeInTheDocument();
  });

  it("marca un festivo del mes en curso con su motivo", async () => {
    const now = new Date();
    const holidayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    fetchHolidays.mockResolvedValue([{ id: null, date: holidayDate, label: "Día festivo", isNational: true }]);

    render(<WorkerCalendar />);

    expect(await screen.findByTitle("Festivo: Día festivo")).toBeInTheDocument();
  });

  it("marca un día de baja/permiso en curso", async () => {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    fetchLeaves.mockResolvedValue([
      { id: "l1", userId: "u1", type: "sick_leave", startDate: startOfMonth, endDate: null, createdBy: "a1", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    render(<WorkerCalendar />);

    expect((await screen.findAllByTitle("Baja/permiso: Enfermedad")).length).toBeGreaterThan(0);
  });

  it("lista los eventos del mes al lado del calendario", async () => {
    const now = new Date();
    const holidayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-15`;
    fetchHolidays.mockResolvedValue([{ id: null, date: holidayDate, label: "Día festivo", isNational: true }]);

    render(<WorkerCalendar />);

    expect(await screen.findByText("Festivo: Día festivo")).toBeInTheDocument();
    expect(screen.getByText(holidayDate)).toBeInTheDocument();
  });

  it("cambia de mes al navegar", async () => {
    const user = userEvent.setup();
    render(<WorkerCalendar />);
    await screen.findByLabelText("Mes siguiente");

    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    await user.click(screen.getByLabelText("Mes siguiente"));

    expect(await screen.findByText(`${monthNames[next.getMonth()]} ${next.getFullYear()}`)).toBeInTheDocument();
  });

  it("cambia de mes al navegar hacia atrás", async () => {
    const user = userEvent.setup();
    render(<WorkerCalendar />);
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

  it("no carga los datos del calendario si no hay usuario autenticado", async () => {
    useAuth.mockReturnValue({ user: null });

    render(<WorkerCalendar />);

    expect(await screen.findByText("Mi calendario")).toBeInTheDocument();
    expect(fetchHolidays).not.toHaveBeenCalled();
    expect(fetchLeaves).not.toHaveBeenCalled();
    expect(fetchMyScheduledAbsences).not.toHaveBeenCalled();
    expect(fetchMyVacationRequests).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de un ApiError cuando fallan las cargas del calendario", async () => {
    fetchHolidays.mockRejectedValue(new ApiError("Error festivos", 500));
    fetchLeaves.mockRejectedValue(new ApiError("Error bajas", 500));
    fetchMyScheduledAbsences.mockRejectedValue(new ApiError("Error ausencias", 500));
    fetchMyVacationRequests.mockRejectedValue(new ApiError("Error vacaciones", 500));

    render(<WorkerCalendar />);

    expect(await screen.findByText("Error vacaciones")).toBeInTheDocument();
  });

  it("usa un mensaje genérico cuando el error de las cargas no es un ApiError", async () => {
    fetchHolidays.mockRejectedValue(new Error("boom"));
    fetchLeaves.mockRejectedValue(new Error("boom"));
    fetchMyScheduledAbsences.mockRejectedValue(new Error("boom"));
    fetchMyVacationRequests.mockRejectedValue(new Error("boom"));

    render(<WorkerCalendar />);

    expect(await screen.findByText("No se pudieron cargar las vacaciones")).toBeInTheDocument();
  });

  it("calcula el rango de una baja de varios días y omite las bajas fuera del mes", async () => {
    const multiDay = {
      id: "l1", userId: "u1", type: "sick_leave" as const,
      startDate: isoInMonth(5), endDate: isoInMonth(10),
      createdBy: "a1", createdAt: "2026-01-01T00:00:00.000Z",
    };
    const singleDay = {
      id: "l2", userId: "u1", type: "sick_leave" as const,
      startDate: isoInMonth(20), endDate: isoInMonth(20),
      createdBy: "a1", createdAt: "2026-01-01T00:00:00.000Z",
    };
    const outOfRange = {
      id: "l3", userId: "u1", type: "sick_leave" as const,
      startDate: isoPrevMonth(5), endDate: isoPrevMonth(10),
      createdBy: "a1", createdAt: "2026-01-01T00:00:00.000Z",
    };
    fetchLeaves.mockResolvedValue([multiDay, singleDay, outOfRange]);

    render(<WorkerCalendar />);

    expect(await screen.findByText(`${isoInMonth(5)} – ${isoInMonth(10)}`)).toBeInTheDocument();
    expect(screen.getByText(isoInMonth(20))).toBeInTheDocument();
    expect(screen.queryByText(`${isoPrevMonth(5)} – ${isoPrevMonth(10)}`)).not.toBeInTheDocument();
    expect((await screen.findAllByTitle("Baja/permiso: Enfermedad")).length).toBeGreaterThan(0);
  });

  it("gestiona vacaciones aprobadas, rechazadas, canceladas y fuera de mes", async () => {
    const approvedMulti = {
      id: "v1", userId: "u1", startDate: isoInMonth(3), endDate: isoInMonth(8),
      status: "approved" as const, decidedBy: "s1", decidedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const approvedSingle = {
      id: "v2", userId: "u1", startDate: isoInMonth(20), endDate: isoInMonth(20),
      status: "approved" as const, decidedBy: "s1", decidedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const rejected = {
      id: "v3", userId: "u1", startDate: isoInMonth(12), endDate: isoInMonth(12),
      status: "rejected" as const, decidedBy: "s1", decidedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const cancelled = {
      id: "v4", userId: "u1", startDate: isoInMonth(15), endDate: isoInMonth(15),
      status: "cancelled" as const, decidedBy: null, decidedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const outOfRange = {
      id: "v5", userId: "u1", startDate: isoNextMonth(3), endDate: isoNextMonth(8),
      status: "approved" as const, decidedBy: "s1", decidedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    fetchMyVacationRequests.mockResolvedValue([approvedMulti, approvedSingle, rejected, cancelled, outOfRange]);

    render(<WorkerCalendar />);

    expect(await screen.findByText(`${isoInMonth(3)} – ${isoInMonth(8)}`)).toBeInTheDocument();
    expect(screen.getByText(isoInMonth(20))).toBeInTheDocument();
    expect(screen.queryByText(isoInMonth(12))).not.toBeInTheDocument();
    expect(screen.queryByText(isoInMonth(15))).not.toBeInTheDocument();
    expect(screen.queryByText(`${isoNextMonth(3)} – ${isoNextMonth(8)}`)).not.toBeInTheDocument();
    expect((await screen.findAllByTitle(/Vacaciones \(Aprobada\)/)).length).toBeGreaterThan(0);
  });

  it("incluye ausencias puntuales del mes en la lista de eventos y omite las de otros meses", async () => {
    const inRange = {
      id: "a1", userId: "u1", date: isoInMonth(12),
      startTime: "10:00", endTime: "11:00", reason: "Cita médica",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const outOfRange = {
      id: "a2", userId: "u1", date: isoNextMonth(5),
      startTime: "09:00", endTime: "09:30", reason: "Otra cita",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    fetchMyScheduledAbsences.mockResolvedValue([inRange, outOfRange]);

    render(<WorkerCalendar />);

    expect(await screen.findByText("Ausencia puntual: Cita médica")).toBeInTheDocument();
    expect(screen.queryByText("Ausencia puntual: Otra cita")).not.toBeInTheDocument();
    expect((await screen.findAllByTitle("Ausencia puntual: Cita médica")).length).toBeGreaterThan(0);
  });
});
