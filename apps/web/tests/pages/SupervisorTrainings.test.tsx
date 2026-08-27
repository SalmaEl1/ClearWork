import type { SupervisorDashboardResponse, TeamTrainingAssignmentDTO, TrainingDTO } from "@clearwork/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorTrainings } from "../../src/pages/supervisor/SupervisorTrainings.js";

const fetchTrainings = vi.hoisted(() => vi.fn());
const fetchSupervisorDashboard = vi.hoisted(() => vi.fn());
const assignTraining = vi.hoisted(() => vi.fn());
const fetchTeamTrainingAssignments = vi.hoisted(() => vi.fn());
const deleteTrainingAssignment = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/trainings.js", () => ({ fetchTrainings }));
vi.mock("../../src/api/dashboard.js", () => ({ fetchSupervisorDashboard }));
vi.mock("../../src/api/trainingAssignments.js", () => ({
  assignTraining,
  fetchTeamTrainingAssignments,
  deleteTrainingAssignment,
}));

function training(overrides: Partial<TrainingDTO> = {}): TrainingDTO {
  return { id: "t1", title: "Prevención de riesgos", createdAt: "2026-01-01T00:00:00.000Z", ...overrides };
}

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
        activeTaskTitle: null,
        hoursThisWeek: 10,
      },
    ],
    projects: [],
  };
}

function assignment(overrides: Partial<TeamTrainingAssignmentDTO> = {}): TeamTrainingAssignmentDTO {
  return {
    id: "a1",
    trainingId: "t1",
    userId: "u1",
    userFullName: "Juan Worker",
    trainingTitle: "Prevención de riesgos",
    assignedBy: "s1",
    assignedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("SupervisorTrainings", () => {
  beforeEach(() => {
    fetchTrainings.mockReset().mockResolvedValue([training()]);
    fetchSupervisorDashboard.mockReset().mockResolvedValue(dashboard());
    fetchTeamTrainingAssignments.mockReset().mockResolvedValue([assignment()]);
    assignTraining.mockReset().mockResolvedValue(assignment());
    deleteTrainingAssignment.mockReset().mockResolvedValue(undefined);
  });

  it("lista las formaciones ya asignadas al equipo", async () => {
    render(<SupervisorTrainings />);
    const list = await screen.findByRole("list");
    expect(within(list).getByText("Juan Worker")).toBeInTheDocument();
    expect(within(list).getByText("Prevención de riesgos")).toBeInTheDocument();
  });

  it("asigna una formación del catálogo a un miembro del equipo", async () => {
    const user = userEvent.setup();
    render(<SupervisorTrainings />);
    await screen.findByText("Asignar formación");

    await user.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() => expect(assignTraining).toHaveBeenCalledWith({ trainingId: "t1", userId: "u1" }));
  });

  it("quita una formación asignada", async () => {
    const user = userEvent.setup();
    render(<SupervisorTrainings />);
    await within(await screen.findByRole("list")).findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Quitar" }));

    await waitFor(() => expect(deleteTrainingAssignment).toHaveBeenCalledWith("a1"));
  });
});
