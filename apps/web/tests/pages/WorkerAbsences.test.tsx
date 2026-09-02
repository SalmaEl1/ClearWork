import type { ScheduledAbsenceDTO } from "@clearwork/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerAbsences } from "../../src/pages/worker/WorkerAbsences.js";

const createScheduledAbsence = vi.hoisted(() => vi.fn());
const fetchMyScheduledAbsences = vi.hoisted(() => vi.fn());
const deleteScheduledAbsence = vi.hoisted(() => vi.fn());

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

function absence(overrides: Partial<ScheduledAbsenceDTO> = {}): ScheduledAbsenceDTO {
  return {
    id: "a1",
    userId: "u1",
    date: isoOffset(5),
    startTime: "10:00",
    endTime: "11:00",
    reason: "Cita médica",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkerAbsences />
    </MemoryRouter>,
  );
}

describe("WorkerAbsences", () => {
  beforeEach(() => {
    fetchMyScheduledAbsences.mockReset().mockResolvedValue([absence()]);
    createScheduledAbsence.mockReset().mockResolvedValue(absence());
    deleteScheduledAbsence.mockReset().mockResolvedValue(undefined);
  });

  it("lista las ausencias puntuales próximas", async () => {
    renderPage();
    expect(await screen.findByText("Cita médica")).toBeInTheDocument();
    expect(screen.getByText(`${isoOffset(5)}, 10:00–11:00`)).toBeInTheDocument();
  });

  it("programa una ausencia eligiendo el día en el calendario", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cita médica");

    const now = new Date();
    await user.click(screen.getByRole("button", { name: String(now.getDate()) }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "09:30" } });
    await user.type(screen.getByLabelText("Motivo"), "Gestión legal");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    await waitFor(() =>
      expect(createScheduledAbsence).toHaveBeenCalledWith({
        date: isoOffset(0),
        startTime: "09:00",
        endTime: "09:30",
        reason: "Gestión legal",
      }),
    );
  });

  it("programa una ausencia con la fecha manual", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cita médica");

    await user.click(screen.getByRole("button", { name: "Fecha manual" }));
    const day = isoOffset(7);
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
    renderPage();
    await screen.findByText("Cita médica");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteScheduledAbsence).toHaveBeenCalledWith("a1"));
  });

  it("enlaza al historial de ausencias", async () => {
    renderPage();
    await screen.findByText("Cita médica");
    expect(screen.getByRole("link", { name: "Ver historial →" })).toHaveAttribute(
      "href",
      "/worker/absences/history",
    );
  });
});
