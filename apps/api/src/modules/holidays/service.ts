import type { HolidayDTO } from "@clearwork/shared";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { nationalHolidaysForYear } from "./nationalHolidays.js";
import * as repo from "./repository.js";
import type { HolidayRow } from "./repository.js";

function toDTO(row: HolidayRow): HolidayDTO {
  return { id: row.id, date: row.date, label: row.label, isNational: false };
}

/** Festivos nacionales (calculados) + personalizados (guardados) de un
 * año, ordenados por fecha — lo que ve el calendario para bloquear esas
 * fechas y lo que gestiona el admin desde Ajustes. */
export async function listHolidaysForYear(year: number): Promise<HolidayDTO[]> {
  const national: HolidayDTO[] = nationalHolidaysForYear(year).map((h) => ({
    id: null,
    date: h.date,
    label: h.label,
    isNational: true,
  }));
  const custom = await repo.listCustomHolidays();
  const customForYear = custom
    .filter((h) => h.date.slice(0, 4) === String(year))
    .map(toDTO);

  return [...national, ...customForYear].sort((a, b) => a.date.localeCompare(b.date));
}

/** Todas las fechas (nacionales + personalizadas) que caen dentro de los
 * años dados, como un Set de cadenas AAAA-MM-DD — usado tanto por el
 * cálculo del saldo de vacaciones (vacations/balance.ts) como por el
 * calendario para bloquear la selección de esos días. */
export async function getHolidayDateSetForYears(years: number[]): Promise<Set<string>> {
  const uniqueYears = [...new Set(years)];
  const national = uniqueYears.flatMap((y) => nationalHolidaysForYear(y).map((h) => h.date));
  const custom = await repo.listCustomHolidays();
  const customDates = custom
    .map((h) => h.date)
    .filter((date) => uniqueYears.includes(Number(date.slice(0, 4))));
  return new Set([...national, ...customDates]);
}

export async function createHoliday(input: { date: string; label: string }): Promise<HolidayDTO> {
  const year = Number(input.date.slice(0, 4));
  const isAlreadyNational = nationalHolidaysForYear(year).some((h) => h.date === input.date);
  if (isAlreadyNational) {
    throw new ConflictError("Esa fecha ya es un festivo nacional");
  }

  const existing = await repo.findCustomHolidayByDate(input.date);
  if (existing) {
    throw new ConflictError("Ya hay un festivo personalizado en esa fecha");
  }

  const created = await repo.insertCustomHoliday(input.date, input.label);
  return toDTO(created);
}

export async function deleteHoliday(id: string): Promise<void> {
  const holiday = await repo.findCustomHolidayById(id);
  if (!holiday) throw new NotFoundError("Festivo no encontrado");
  await repo.deleteCustomHolidayById(id);
}
