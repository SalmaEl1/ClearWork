/**
 * Festivos nacionales de España de fecha fija. Se calculan en código
 * (no se guardan en base de datos): no cambian de un año a otro y nadie
 * los puede borrar, a diferencia de los festivos personalizados (ver
 * repository.ts).
 *
 * Simplificación deliberada: no incluye los festivos móviles ligados a
 * la Semana Santa (p. ej. Viernes Santo), que exigirían calcular la
 * fecha de Pascua para cada año — fuera del alcance de este TFG.
 */
const FIXED_NATIONAL_HOLIDAYS = [
  { month: 1, day: 1, label: "Año Nuevo" },
  { month: 1, day: 6, label: "Epifanía del Señor" },
  { month: 5, day: 1, label: "Fiesta del Trabajo" },
  { month: 8, day: 15, label: "Asunción de la Virgen" },
  { month: 10, day: 12, label: "Fiesta Nacional de España" },
  { month: 11, day: 1, label: "Todos los Santos" },
  { month: 12, day: 6, label: "Día de la Constitución" },
  { month: 12, day: 8, label: "Inmaculada Concepción" },
  { month: 12, day: 25, label: "Navidad" },
] as const;

export type NationalHoliday = { date: string; label: string };

export function nationalHolidaysForYear(year: number): NationalHoliday[] {
  return FIXED_NATIONAL_HOLIDAYS.map(({ month, day, label }) => ({
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    label,
  }));
}
