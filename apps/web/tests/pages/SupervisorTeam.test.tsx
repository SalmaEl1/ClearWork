import type { SupervisorDashboardResponse } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorTeam } from "../../src/pages/supervisor/SupervisorTeam.js";

const fetchSupervisorDashboard = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/dashboard.js", () => ({ fetchSupervisorDashboard }));

function dashboard(): SupervisorDashboardResponse {
  return {
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
  };
}

describe("SupervisorTeam", () => {
  beforeEach(() => {
    fetchSupervisorDashboard.mockReset().mockResolvedValue(dashboard());
  });

  it("muestra el estado del equipo", async () => {
    render(
      <MemoryRouter>
        <SupervisorTeam />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Juan Worker")).toBeInTheDocument();
    expect(screen.getByText("Trabajando")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga", async () => {
    fetchSupervisorDashboard.mockRejectedValue(new Error("network down"));
    render(
      <MemoryRouter>
        <SupervisorTeam />
      </MemoryRouter>,
    );
    expect(await screen.findByText("No se pudo cargar el equipo")).toBeInTheDocument();
  });
});
