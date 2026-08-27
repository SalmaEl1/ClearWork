import type { TeamVacationRequestDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorVacations } from "../../src/pages/supervisor/SupervisorVacations.js";

const fetchTeamVacationRequests = vi.hoisted(() => vi.fn());
const approveVacationRequest = vi.hoisted(() => vi.fn());
const rejectVacationRequest = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/vacations.js", () => ({
  fetchTeamVacationRequests,
  approveVacationRequest,
  rejectVacationRequest,
}));

function request(overrides: Partial<TeamVacationRequestDTO> = {}): TeamVacationRequestDTO {
  return {
    id: "v1",
    userId: "u1",
    userFullName: "Juan Worker",
    startDate: "2026-03-01",
    endDate: "2026-03-10",
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("SupervisorVacations", () => {
  beforeEach(() => {
    fetchTeamVacationRequests.mockReset().mockResolvedValue([request()]);
    approveVacationRequest.mockReset().mockResolvedValue(request({ status: "approved" }));
    rejectVacationRequest.mockReset().mockResolvedValue(request({ status: "rejected" }));
  });

  it("muestra el estado vacío cuando el equipo no tiene solicitudes", async () => {
    fetchTeamVacationRequests.mockResolvedValue([]);
    render(<SupervisorVacations />);
    expect(await screen.findByText("Tu equipo no tiene solicitudes de vacaciones.")).toBeInTheDocument();
  });

  it("lista las solicitudes del equipo con quién la pidió", async () => {
    render(<SupervisorVacations />);
    expect(await screen.findByText("Juan Worker")).toBeInTheDocument();
    expect(screen.getByText("2026-03-01 – 2026-03-10")).toBeInTheDocument();
  });

  it("aprueba una solicitud pendiente", async () => {
    const user = userEvent.setup();
    render(<SupervisorVacations />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() => expect(approveVacationRequest).toHaveBeenCalledWith("v1"));
  });

  it("rechaza una solicitud pendiente", async () => {
    const user = userEvent.setup();
    render(<SupervisorVacations />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    await waitFor(() => expect(rejectVacationRequest).toHaveBeenCalledWith("v1"));
  });

  it("no ofrece aprobar/rechazar una solicitud ya decidida", async () => {
    fetchTeamVacationRequests.mockResolvedValue([request({ status: "approved" })]);
    render(<SupervisorVacations />);
    await screen.findByText("Juan Worker");
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  });
});
