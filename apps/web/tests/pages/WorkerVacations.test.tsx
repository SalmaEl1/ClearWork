import type { ScheduledAbsenceDTO, VacationRequestDTO } from "@clearwork/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerVacations } from "../../src/pages/worker/WorkerVacations.js";

const createVacationRequest = vi.hoisted(() => vi.fn());
const fetchMyVacationRequests = vi.hoisted(() => vi.fn());
const cancelVacationRequest = vi.hoisted(() => vi.fn());
const createScheduledAbsence = vi.hoisted(() => vi.fn());
const fetchMyScheduledAbsences = vi.hoisted(() => vi.fn());
const deleteScheduledAbsence = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/vacations.js", () => ({
  createVacationRequest,
  fetchMyVacationRequests,
  cancelVacationRequest,
}));

vi.mock("../../src/api/scheduledAbsences.js", () => ({
  createScheduledAbsence,
  fetchMyScheduledAbsences,
  deleteScheduledAbsence,
}));

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function request(overrides: Partial<VacationRequestDTO> = {}): VacationRequestDTO {
  return {
    id: "v1",
    userId: "u1",
    startDate: "2026-03-01",
    endDate: "2026-03-10",
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function absence(overrides: Partial<ScheduledAbsenceDTO> = {}): ScheduledAbsenceDTO {
  return {
    id: "a1",
    userId: "u1",
    date: "2026-03-05",
    startTime: "10:00",
    endTime: "11:00",
    reason: "Cita médica",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("WorkerVacations", () => {
  beforeEach(() => {
    fetchMyVacationRequests.mockReset().mockResolvedValue([request()]);
    createVacationRequest.mockReset().mockResolvedValue(request());
    cancelVacationRequest.mockReset().mockResolvedValue(request({ status: "cancelled" }));
    fetchMyScheduledAbsences.mockReset().mockResolvedValue([absence()]);
    createScheduledAbsence.mockReset().mockResolvedValue(absence());
    deleteScheduledAbsence.mockReset().mockResolvedValue(undefined);
  });

  it("lista las solicitudes propias con su estado", async () => {
    render(<WorkerVacations />);
    expect(await screen.findByText("2026-03-01 – 2026-03-10")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("solo ofrece cancelar cuando la solicitud está pendiente", async () => {
    fetchMyVacationRequests.mockResolvedValue([request({ status: "approved" })]);
    render(<WorkerVacations />);
    await screen.findByText("Aprobada");
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("envía una nueva solicitud con las fechas indicadas", async () => {
    const user = userEvent.setup();
    render(<WorkerVacations />);
    await screen.findByText("2026-03-01 – 2026-03-10");

    const start = isoOffset(10);
    const end = isoOffset(20);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: start } });
    fireEvent.change(screen.getByLabelText("Fecha de fin"), { target: { value: end } });
    await user.click(screen.getByRole("button", { name: "Solicitar" }));

    await waitFor(() =>
      expect(createVacationRequest).toHaveBeenCalledWith({ startDate: start, endDate: end }),
    );
  });

  it("cancela una solicitud pendiente", async () => {
    const user = userEvent.setup();
    render(<WorkerVacations />);
    await screen.findByText("2026-03-01 – 2026-03-10");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(cancelVacationRequest).toHaveBeenCalledWith("v1"));
  });

  it("lista las ausencias puntuales propias", async () => {
    render(<WorkerVacations />);
    expect(await screen.findByText("Cita médica")).toBeInTheDocument();
    expect(screen.getByText("2026-03-05, 10:00–11:00")).toBeInTheDocument();
  });

  it("programa una nueva ausencia puntual", async () => {
    const user = userEvent.setup();
    render(<WorkerVacations />);
    await screen.findByText("Cita médica");

    const day = isoOffset(5);
    fireEvent.change(screen.getByLabelText("Día"), { target: { value: day } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "09:30" } });
    await user.type(screen.getByLabelText("Motivo"), "Gestión legal");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    await waitFor(() =>
      expect(createScheduledAbsence).toHaveBeenCalledWith({
        date: day,
        startTime: "09:00",
        endTime: "09:30",
        reason: "Gestión legal",
      }),
    );
  });

  it("elimina una ausencia puntual programada", async () => {
    const user = userEvent.setup();
    render(<WorkerVacations />);
    await screen.findByText("Cita médica");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteScheduledAbsence).toHaveBeenCalledWith("a1"));
  });
});
