import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkerHistory } from "../../src/pages/worker/WorkerHistory.js";

const fetchWorkSessionHistory = vi.hoisted(() => vi.fn());
const fetchLeaves = vi.hoisted(() => vi.fn());
const fetchMyVacationRequests = vi.hoisted(() => vi.fn());
const fetchMyScheduledAbsences = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/workSessions.js", () => ({ fetchWorkSessionHistory }));
vi.mock("../../src/api/leaves.js", () => ({ fetchLeaves }));
vi.mock("../../src/api/vacations.js", () => ({ fetchMyVacationRequests }));
vi.mock("../../src/api/scheduledAbsences.js", () => ({ fetchMyScheduledAbsences }));
vi.mock("../../src/auth/AuthContext.js", () => ({
  useAuth: () => ({ user: { id: "u1", fullName: "Juan Worker" } }),
}));

describe("WorkerHistory", () => {
  it("junta el fichaje con los periodos de baja/vacaciones/ausencia del propio trabajador", async () => {
    fetchWorkSessionHistory.mockResolvedValue([
      {
        id: "s1",
        userId: "u1",
        startedAt: "2026-03-05T09:00:00.000Z",
        endedAt: "2026-03-05T17:00:00.000Z",
        workedMinutes: 480,
        breaks: [],
      },
    ]);
    fetchLeaves.mockResolvedValue([
      {
        id: "l1",
        userId: "u1",
        type: "sick_leave",
        startDate: "2026-03-01",
        endDate: "2026-03-03",
        createdBy: "admin1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    fetchMyVacationRequests.mockResolvedValue([
      {
        id: "v1",
        userId: "u1",
        startDate: "2026-02-01",
        endDate: "2026-02-05",
        status: "approved",
        decidedBy: "sup1",
        decidedAt: "2026-01-15T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    fetchMyScheduledAbsences.mockResolvedValue([
      {
        id: "a1",
        userId: "u1",
        date: "2026-03-10",
        startTime: "10:00",
        endTime: "11:00",
        reason: "Cita médica",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    render(<WorkerHistory />);

    expect(await screen.findByText("8h 0min")).toBeInTheDocument();
    expect(screen.getByText("Enfermedad")).toBeInTheDocument();
    expect(screen.getByText("Vacaciones")).toBeInTheDocument();
    expect(screen.getByText("Ausencia puntual (Cita médica)")).toBeInTheDocument();
    expect(fetchLeaves).toHaveBeenCalledWith("u1");
  });
});
