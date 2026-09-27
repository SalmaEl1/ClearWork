import type { ScheduledAbsenceDTO } from "@clearwork/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { WorkerAbsences } from "../../src/pages/worker/WorkerAbsences.js";

const createScheduledAbsence = vi.hoisted(() => vi.fn());
const fetchMyScheduledAbsences = vi.hoisted(() => vi.fn());
const deleteScheduledAbsence = vi.hoisted(() => vi.fn());
const fetchHolidays = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/scheduledAbsences.js", () => ({
  createScheduledAbsence,
  fetchMyScheduledAbsences,
  deleteScheduledAbsence,
}));
vi.mock("../../src/api/holidays.js", () => ({ fetchHolidays }));

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** El mini-calendario ya no deja elegir fin de semana (sin festivos
 * mockeados, esa es la única razón por la que un día podría estar
 * deshabilitado aquí): el primer día a partir de `minOffset` que caiga
 * entre semana, dentro del mismo mes que hoy. */
function nextWeekdayOffset(minOffset: number): number {
  for (let offset = minOffset; offset < minOffset + 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const weekday = d.getDay();
    if (weekday !== 0 && weekday !== 6) return offset;
  }
  return minOffset;
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
    fetchHolidays.mockReset().mockResolvedValue([]);
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

    const offset = nextWeekdayOffset(0);
    const day = new Date();
    day.setDate(day.getDate() + offset);
    await user.click(screen.getByRole("button", { name: String(day.getDate()) }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "09:30" } });
    await user.type(screen.getByLabelText("Motivo"), "Gestión legal");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    await waitFor(() =>
      expect(createScheduledAbsence).toHaveBeenCalledWith({
        date: isoOffset(offset),
        startTime: "09:00",
        endTime: "09:30",
        reason: "Gestión legal",
      }),
    );
  });

  it("no deja elegir un fin de semana en el calendario", async () => {
    renderPage();
    await screen.findByText("Cita médica");

    const now = new Date();
    // Busca el próximo sábado a partir de hoy, dentro del mismo mes.
    let saturdayOffset = -1;
    for (let offset = 0; offset < 7; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      if (d.getDay() === 6 && d.getMonth() === now.getMonth()) {
        saturdayOffset = offset;
        break;
      }
    }
    if (saturdayOffset === -1) return; // no hay sábado este mes desde hoy: nada que comprobar.

    const saturday = new Date();
    saturday.setDate(saturday.getDate() + saturdayOffset);
    expect(screen.getByRole("button", { name: String(saturday.getDate()) })).toBeDisabled();
  });

  it("programa una ausencia con la fecha manual", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cita médica");

    await user.click(screen.getByRole("button", { name: "Fecha manual" }));
    const day = isoOffset(nextWeekdayOffset(7));
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

  it("rechaza un fin de semana escrito a mano, sin llamar a la API", async () => {
    let saturdayOffset = -1;
    for (let offset = 0; offset < 14; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      if (d.getDay() === 6) {
        saturdayOffset = offset;
        break;
      }
    }
    const saturday = isoOffset(saturdayOffset);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cita médica");

    await user.click(screen.getByRole("button", { name: "Fecha manual" }));
    fireEvent.change(screen.getByLabelText("Día"), { target: { value: saturday } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "09:30" } });
    await user.type(screen.getByLabelText("Motivo"), "Gestión legal");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    expect(await screen.findByText("No se puede programar una ausencia en fin de semana")).toBeInTheDocument();
    expect(createScheduledAbsence).not.toHaveBeenCalled();
  });

  it("rechaza un festivo escrito a mano, sin llamar a la API", async () => {
    const holidayDate = isoOffset(nextWeekdayOffset(3));
    fetchHolidays.mockResolvedValue([{ id: "h1", date: holidayDate, label: "Día del Trabajo", isNational: true }]);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cita médica");

    await user.click(screen.getByRole("button", { name: "Fecha manual" }));
    fireEvent.change(screen.getByLabelText("Día"), { target: { value: holidayDate } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "09:30" } });
    await user.type(screen.getByLabelText("Motivo"), "Gestión legal");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    expect(
      await screen.findByText(`No se puede programar una ausencia en festivo (Día del Trabajo)`),
    ).toBeInTheDocument();
    expect(createScheduledAbsence).not.toHaveBeenCalled();
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

  it("exige elegir un día antes de programar la ausencia", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cita médica");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "09:30" } });
    await user.type(screen.getByLabelText("Motivo"), "Gestión legal");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    expect(await screen.findByText("Elige un día")).toBeInTheDocument();
    expect(createScheduledAbsence).not.toHaveBeenCalled();
  });

  it("deseleccionar el día elegido en el calendario lo quita de la selección", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cita médica");

    const offset = nextWeekdayOffset(0);
    const day = new Date();
    day.setDate(day.getDate() + offset);
    const dayButton = screen.getByRole("button", { name: String(day.getDate()) });

    await user.click(dayButton);
    expect(dayButton).toHaveAttribute("aria-pressed", "true");

    await user.click(dayButton);
    expect(dayButton).toHaveAttribute("aria-pressed", "false");
  });

  it("muestra el mensaje de un ApiError si falla programar una ausencia", async () => {
    const user = userEvent.setup();
    createScheduledAbsence.mockRejectedValue(new ApiError("Ya tienes una ausencia ese día", 409));
    renderPage();
    await screen.findByText("Cita médica");

    const offset = nextWeekdayOffset(0);
    const day = new Date();
    day.setDate(day.getDate() + offset);
    await user.click(screen.getByRole("button", { name: String(day.getDate()) }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "09:30" } });
    await user.type(screen.getByLabelText("Motivo"), "Gestión legal");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    expect(await screen.findByText("Ya tienes una ausencia ese día")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al programar una ausencia no es un ApiError", async () => {
    const user = userEvent.setup();
    createScheduledAbsence.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Cita médica");

    const offset = nextWeekdayOffset(0);
    const day = new Date();
    day.setDate(day.getDate() + offset);
    await user.click(screen.getByRole("button", { name: String(day.getDate()) }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "09:30" } });
    await user.type(screen.getByLabelText("Motivo"), "Gestión legal");
    await user.click(screen.getByRole("button", { name: "Programar" }));

    expect(await screen.findByText("No se pudo programar la ausencia")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla la carga de ausencias", async () => {
    fetchMyScheduledAbsences.mockRejectedValue(new ApiError("No autorizado", 403));
    renderPage();
    expect(await screen.findByText("No autorizado")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error de carga de ausencias no es un ApiError", async () => {
    fetchMyScheduledAbsences.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByText("No se pudieron cargar las ausencias")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla eliminar una ausencia", async () => {
    const user = userEvent.setup();
    deleteScheduledAbsence.mockRejectedValue(new ApiError("No se puede eliminar ya pasada", 409));
    renderPage();
    await screen.findByText("Cita médica");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se puede eliminar ya pasada")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al eliminar una ausencia no es un ApiError", async () => {
    const user = userEvent.setup();
    deleteScheduledAbsence.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Cita médica");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se pudo eliminar")).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay ausencias puntuales próximas", async () => {
    fetchMyScheduledAbsences.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No tienes ausencias puntuales programadas.")).toBeInTheDocument();
  });
});
