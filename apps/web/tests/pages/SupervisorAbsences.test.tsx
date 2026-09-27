import type { SupervisorDashboardResponse, TeamScheduledAbsenceDTO } from "@clearwork/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { SupervisorAbsences } from "../../src/pages/supervisor/SupervisorAbsences.js";

const fetchSupervisorDashboard = vi.hoisted(() => vi.fn());
const createTeamScheduledAbsence = vi.hoisted(() => vi.fn());
const deleteScheduledAbsence = vi.hoisted(() => vi.fn());
const fetchTeamScheduledAbsences = vi.hoisted(() => vi.fn());
const updateScheduledAbsence = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/dashboard.js", () => ({ fetchSupervisorDashboard }));
vi.mock("../../src/api/scheduledAbsences.js", () => ({
  createTeamScheduledAbsence,
  deleteScheduledAbsence,
  fetchTeamScheduledAbsences,
  updateScheduledAbsence,
}));

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function absence(overrides: Partial<TeamScheduledAbsenceDTO> = {}): TeamScheduledAbsenceDTO {
  return {
    id: "a1",
    userId: "u1",
    userFullName: "Juan Worker",
    date: isoOffset(5),
    startTime: "10:00",
    endTime: "11:00",
    reason: "Cita médica",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
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
        leaveId: null,
        scheduledAbsenceReason: null,
        hoursThisWeek: 12.5,
        vacationBalance: { year: 2026, total: 23, used: 0, remaining: 23 },
      },
    ],
    projects: [],
  };
}

describe("SupervisorAbsences", () => {
  function setup() {
    fetchSupervisorDashboard.mockReset().mockResolvedValue(dashboard());
    fetchTeamScheduledAbsences.mockReset().mockResolvedValue([absence()]);
    createTeamScheduledAbsence.mockReset().mockResolvedValue(absence());
    updateScheduledAbsence.mockReset().mockResolvedValue(absence());
    deleteScheduledAbsence.mockReset().mockResolvedValue(undefined);
  }

  it("lista las ausencias del equipo con quién es cada una", async () => {
    setup();
    render(<SupervisorAbsences />);

    expect(await screen.findByText("Juan Worker")).toBeInTheDocument();
    expect(screen.getByText(`${isoOffset(5)}, 10:00–11:00`)).toBeInTheDocument();
    expect(screen.getByText("Cita médica")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando el equipo no tiene ausencias", async () => {
    setup();
    fetchTeamScheduledAbsences.mockResolvedValue([]);
    render(<SupervisorAbsences />);

    expect(
      await screen.findByText("Tu equipo no tiene ausencias puntuales programadas."),
    ).toBeInTheDocument();
  });

  it("programa una ausencia para un miembro del equipo, sin restricción de fecha pasada", async () => {
    setup();
    const user = userEvent.setup();
    render(<SupervisorAbsences />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "+ Programar ausencia" }));
    const dateInput = screen.getByLabelText("Fecha");
    expect(dateInput).not.toHaveAttribute("min");

    fireEvent.change(dateInput, { target: { value: isoOffset(-10) } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "10:00" } });
    await user.type(screen.getByLabelText("Motivo"), "Cita ya pasada");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    await waitFor(() =>
      expect(createTeamScheduledAbsence).toHaveBeenCalledWith({
        userId: "u1",
        date: isoOffset(-10),
        startTime: "09:00",
        endTime: "10:00",
        reason: "Cita ya pasada",
      }),
    );
  });

  it("edita una ausencia existente sin volver a elegir el trabajador", async () => {
    setup();
    const user = userEvent.setup();
    render(<SupervisorAbsences />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.queryByLabelText("Trabajador/a")).not.toBeInTheDocument();

    const reasonInput = screen.getByLabelText("Motivo");
    await user.clear(reasonInput);
    await user.type(reasonInput, "Motivo actualizado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateScheduledAbsence).toHaveBeenCalledWith("a1", {
        date: isoOffset(5),
        startTime: "10:00",
        endTime: "11:00",
        reason: "Motivo actualizado",
      }),
    );
  });

  it("elimina una ausencia tras confirmar", async () => {
    setup();
    const user = userEvent.setup();
    render(<SupervisorAbsences />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteScheduledAbsence).toHaveBeenCalledWith("a1"));
  });

  it("muestra el mensaje de un ApiError si falla programar una ausencia", async () => {
    setup();
    createTeamScheduledAbsence.mockRejectedValue(new ApiError("Ese trabajador ya tiene una ausencia ese día", 409));
    const user = userEvent.setup();
    render(<SupervisorAbsences />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "+ Programar ausencia" }));
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: isoOffset(5) } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "10:00" } });
    await user.type(screen.getByLabelText("Motivo"), "Cita médica");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    expect(await screen.findByText("Ese trabajador ya tiene una ausencia ese día")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al programar una ausencia no es un ApiError", async () => {
    setup();
    createTeamScheduledAbsence.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<SupervisorAbsences />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "+ Programar ausencia" }));
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: isoOffset(5) } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "10:00" } });
    await user.type(screen.getByLabelText("Motivo"), "Cita médica");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    expect(await screen.findByText("No se pudo guardar")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla la carga de ausencias o del equipo", async () => {
    setup();
    fetchTeamScheduledAbsences.mockRejectedValue(new ApiError("No autorizado", 403));
    render(<SupervisorAbsences />);

    expect(await screen.findByText("No autorizado")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error de carga no es un ApiError", async () => {
    setup();
    fetchSupervisorDashboard.mockRejectedValue(new Error("boom"));
    render(<SupervisorAbsences />);

    expect(await screen.findByText("No se pudieron cargar las ausencias")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla eliminar una ausencia", async () => {
    setup();
    deleteScheduledAbsence.mockRejectedValue(new ApiError("No se puede eliminar ya pasada", 409));
    const user = userEvent.setup();
    render(<SupervisorAbsences />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se puede eliminar ya pasada")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al eliminar una ausencia no es un ApiError", async () => {
    setup();
    deleteScheduledAbsence.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<SupervisorAbsences />);
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se pudo eliminar")).toBeInTheDocument();
  });
});
