import type { AppSettingsDTO, HolidayDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { AdminSettings } from "../../src/pages/admin/AdminSettings.js";

const fetchAdminSettings = vi.hoisted(() => vi.fn());
const updateAdminSettings = vi.hoisted(() => vi.fn());
const fetchHolidays = vi.hoisted(() => vi.fn());
const createHoliday = vi.hoisted(() => vi.fn());
const deleteHoliday = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/admin.js", () => ({ fetchAdminSettings, updateAdminSettings }));
vi.mock("../../src/api/holidays.js", () => ({ fetchHolidays, createHoliday, deleteHoliday }));

function makeSettings(overrides: Partial<AppSettingsDTO> = {}): AppSettingsDTO {
  return {
    defaultWeeklyTargetHours: 40,
    excludeWeekendsFromVacationDays: true,
    officeSeatCount: 20,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const nationalHoliday: HolidayDTO = { id: null, date: "2026-01-01", label: "Año Nuevo", isNational: true };
const customHoliday: HolidayDTO = { id: "h1", date: "2026-12-24", label: "Puente de la empresa", isNational: false };

describe("AdminSettings", () => {
  beforeEach(() => {
    fetchAdminSettings.mockReset().mockResolvedValue(makeSettings());
    updateAdminSettings.mockReset().mockResolvedValue(makeSettings());
    fetchHolidays.mockReset().mockResolvedValue([nationalHoliday, customHoliday]);
    createHoliday.mockReset().mockResolvedValue(customHoliday);
    deleteHoliday.mockReset().mockResolvedValue(undefined);
  });

  it("carga y muestra los ajustes actuales", async () => {
    render(<AdminSettings />);
    expect(await screen.findByLabelText("Horas objetivo semanales por defecto")).toHaveValue(40);
    expect(screen.getByLabelText(/fines de semana no cuentan/)).toBeChecked();
    expect(screen.getByLabelText("Asientos disponibles en la oficina")).toHaveValue(20);
  });

  it("carga y muestra los festivos del año, nacionales sin botón de eliminar", async () => {
    render(<AdminSettings />);
    expect(await screen.findByText("Año Nuevo")).toBeInTheDocument();
    expect(screen.getByText("Puente de la empresa")).toBeInTheDocument();
    expect(screen.getByText("Nacional")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Eliminar" })).toHaveLength(1);
  });

  it("guarda los cambios de los ajustes generales", async () => {
    const user = userEvent.setup();
    render(<AdminSettings />);
    const hoursInput = await screen.findByLabelText("Horas objetivo semanales por defecto");

    await user.clear(hoursInput);
    await user.type(hoursInput, "35");
    await user.click(screen.getByLabelText(/fines de semana no cuentan/));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateAdminSettings).toHaveBeenCalledWith({
        defaultWeeklyTargetHours: 35,
        excludeWeekendsFromVacationDays: false,
        officeSeatCount: 20,
      }),
    );
    expect(await screen.findByText("Ajustes guardados.")).toBeInTheDocument();
  });

  it("muestra el error de la API si falla el guardado de los ajustes", async () => {
    updateAdminSettings.mockRejectedValue(new ApiError("No se pudo guardar", 400));
    const user = userEvent.setup();
    render(<AdminSettings />);
    await screen.findByLabelText("Horas objetivo semanales por defecto");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("No se pudo guardar")).toBeInTheDocument();
  });

  it("muestra un aviso si falla la carga de los ajustes", async () => {
    fetchAdminSettings.mockRejectedValue(new ApiError("No se pudieron cargar los ajustes", 500));
    render(<AdminSettings />);
    expect(await screen.findByText("No se pudieron cargar los ajustes")).toBeInTheDocument();
  });

  it("muestra un aviso si falla la carga de los festivos", async () => {
    fetchHolidays.mockRejectedValue(new ApiError("No se pudieron cargar los festivos", 500));
    render(<AdminSettings />);
    expect(await screen.findByText("No se pudieron cargar los festivos")).toBeInTheDocument();
  });

  it("añade un festivo personalizado y recarga la lista", async () => {
    const user = userEvent.setup();
    render(<AdminSettings />);
    await screen.findByText("Año Nuevo");

    await user.type(screen.getByLabelText("Fecha"), "2026-08-15");
    await user.type(screen.getByLabelText("Etiqueta"), "Puente de verano");
    await user.click(screen.getByRole("button", { name: "Añadir festivo" }));

    await waitFor(() =>
      expect(createHoliday).toHaveBeenCalledWith({ date: "2026-08-15", label: "Puente de verano" }),
    );
    await waitFor(() => expect(fetchHolidays).toHaveBeenCalledTimes(2));
  });

  it("muestra el error de la API si falla añadir un festivo", async () => {
    createHoliday.mockRejectedValue(new ApiError("No se pudo añadir el festivo", 400));
    const user = userEvent.setup();
    render(<AdminSettings />);
    await screen.findByText("Año Nuevo");

    await user.type(screen.getByLabelText("Fecha"), "2026-08-15");
    await user.type(screen.getByLabelText("Etiqueta"), "Puente de verano");
    await user.click(screen.getByRole("button", { name: "Añadir festivo" }));

    expect(await screen.findByText("No se pudo añadir el festivo")).toBeInTheDocument();
  });

  it("elimina un festivo personalizado tras confirmar", async () => {
    const user = userEvent.setup();
    render(<AdminSettings />);
    await screen.findByText("Puente de la empresa");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Eliminar" })[1]);

    await waitFor(() => expect(deleteHoliday).toHaveBeenCalledWith("h1"));
  });
});
