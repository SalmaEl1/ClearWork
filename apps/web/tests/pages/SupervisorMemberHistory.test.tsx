import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorMemberHistory } from "../../src/pages/supervisor/SupervisorMemberHistory.js";

const fetchSupervisorDashboard = vi.hoisted(() => vi.fn());
const fetchTeamMemberWorkSessionHistory = vi.hoisted(() => vi.fn());
const fetchLeaves = vi.hoisted(() => vi.fn());
const fetchTeamVacationRequests = vi.hoisted(() => vi.fn());
const fetchTeamMemberScheduledAbsences = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/dashboard.js", () => ({ fetchSupervisorDashboard }));
vi.mock("../../src/api/workSessions.js", () => ({ fetchTeamMemberWorkSessionHistory }));
vi.mock("../../src/api/leaves.js", () => ({ fetchLeaves }));
vi.mock("../../src/api/vacations.js", () => ({ fetchTeamVacationRequests }));
vi.mock("../../src/api/scheduledAbsences.js", () => ({ fetchTeamMemberScheduledAbsences }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/supervisor/team/u1/history"]}>
      <Routes>
        <Route path="/supervisor/team/:id/history" element={<SupervisorMemberHistory />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SupervisorMemberHistory", () => {
  beforeEach(() => {
    fetchSupervisorDashboard.mockReset().mockResolvedValue({
      weekStart: "2026-01-01T00:00:00.000Z",
      weekEnd: "2026-01-08T00:00:00.000Z",
      team: [
        {
          id: "u1",
          fullName: "Juan Worker",
          status: "working",
          breakType: null,
          leaveType: null,
          scheduledAbsenceReason: null,
          hoursThisWeek: 12.5,
        },
      ],
      projects: [],
    });
    fetchTeamMemberWorkSessionHistory.mockReset().mockResolvedValue([]);
    fetchLeaves.mockReset().mockResolvedValue([]);
    fetchTeamVacationRequests.mockReset().mockResolvedValue([]);
    fetchTeamMemberScheduledAbsences.mockReset().mockResolvedValue([]);
  });

  it("muestra el nombre del trabajador sacado del dashboard del supervisor", async () => {
    renderPage();
    expect(await screen.findByText("Historial de fichajes: Juan Worker")).toBeInTheDocument();
    expect(fetchTeamMemberWorkSessionHistory).toHaveBeenCalledWith("u1");
    expect(fetchLeaves).toHaveBeenCalledWith("u1");
    expect(fetchTeamMemberScheduledAbsences).toHaveBeenCalledWith("u1");
  });

  it("filtra las vacaciones del equipo a las de este trabajador", async () => {
    fetchTeamVacationRequests.mockResolvedValue([
      {
        id: "v1",
        userId: "u1",
        userFullName: "Juan Worker",
        startDate: "2026-02-01",
        endDate: "2026-02-05",
        status: "approved",
        decidedBy: "s1",
        decidedAt: "2026-01-15T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "v2",
        userId: "u2",
        userFullName: "Otro Worker",
        startDate: "2026-02-10",
        endDate: "2026-02-12",
        status: "approved",
        decidedBy: "s1",
        decidedAt: "2026-01-15T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    renderPage();

    expect(await screen.findByText("2026-02-01 – 2026-02-05")).toBeInTheDocument();
    expect(screen.queryByText("2026-02-10 – 2026-02-12")).not.toBeInTheDocument();
  });
});
