import type { TeamVacationRequestDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { SupervisorVacations } from "../../src/pages/supervisor/SupervisorVacations.js";

const fetchTeamVacationRequests = vi.hoisted(() => vi.fn());
const approveVacationRequest = vi.hoisted(() => vi.fn());
const rejectVacationRequest = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/vacations.js", () => ({
  fetchTeamVacationRequests,
  approveVacationRequest,
  rejectVacationRequest,
}));

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function request(overrides: Partial<TeamVacationRequestDTO> = {}): TeamVacationRequestDTO {
  return {
    id: "v1",
    userId: "u1",
    userFullName: "Juan Worker",
    startDate: isoOffset(10),
    endDate: isoOffset(19),
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
    expect(screen.getByText(`${isoOffset(10)} – ${isoOffset(19)}`)).toBeInTheDocument();
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

  it("muestra el mensaje de un ApiError cuando falla la carga de solicitudes", async () => {
    fetchTeamVacationRequests.mockRejectedValue(new ApiError("No autorizado", 403));
    render(<SupervisorVacations />);
    expect(await screen.findByText("No autorizado")).toBeInTheDocument();
  });

  it("usa un mensaje genérico cuando el error de carga no es un ApiError", async () => {
    fetchTeamVacationRequests.mockRejectedValue(new Error("boom"));
    render(<SupervisorVacations />);
    expect(await screen.findByText("No se pudieron cargar las solicitudes")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla aprobar una solicitud", async () => {
    const user = userEvent.setup();
    approveVacationRequest.mockRejectedValue(new ApiError("No se puede aprobar ya cancelada", 409));
    render(<SupervisorVacations />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(await screen.findByText("No se puede aprobar ya cancelada")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al aprobar no es un ApiError", async () => {
    const user = userEvent.setup();
    approveVacationRequest.mockRejectedValue(new Error("boom"));
    render(<SupervisorVacations />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(await screen.findByText("No se pudo aprobar")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla rechazar una solicitud", async () => {
    const user = userEvent.setup();
    rejectVacationRequest.mockRejectedValue(new ApiError("No se puede rechazar ya cancelada", 409));
    render(<SupervisorVacations />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(await screen.findByText("No se puede rechazar ya cancelada")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al rechazar no es un ApiError", async () => {
    const user = userEvent.setup();
    rejectVacationRequest.mockRejectedValue(new Error("boom"));
    render(<SupervisorVacations />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(await screen.findByText("No se pudo rechazar")).toBeInTheDocument();
  });
});
