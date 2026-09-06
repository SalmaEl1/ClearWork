import type { PublicUser } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(await screen.findByText("Baja")).toBeInTheDocument();
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

  it("marca un día de baja en curso", async () => {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    fetchLeaves.mockResolvedValue([
      { id: "l1", userId: "u1", type: "sick_leave", startDate: startOfMonth, endDate: null, createdBy: "a1", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    render(<WorkerCalendar />);

    expect((await screen.findAllByTitle("Baja: Enfermedad")).length).toBeGreaterThan(0);
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
});
