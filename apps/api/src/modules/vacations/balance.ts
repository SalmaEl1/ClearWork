/**
 * Saldo anual de vacaciones, a partir de `users.hire_date` (AAAA-MM-DD,
 * lo rellena el admin al crear o editar la cuenta — ver users/schemas.ts).
 *
 * 23 días si la persona empezó el 1 de enero; si empezó más tarde ese
 * mismo año, proporcional a los meses que quedan (mismo criterio que se
 * usa en la práctica: p. ej. empezar en julio da derecho a la mitad del
 * año, aprox. la mitad de los días).
 */
const ANNUAL_VACATION_DAYS = 23;

export function vacationDaysForYear(hireDate: string, year: number): number {
  const joinYear = Number(hireDate.slice(0, 4));
  if (year < joinYear) return 0;
  if (year > joinYear) return ANNUAL_VACATION_DAYS;

  const joinMonth = Number(hireDate.slice(5, 7)); // enero=1 ... diciembre=12
  return Math.round((ANNUAL_VACATION_DAYS * (13 - joinMonth)) / 12);
}

/** Un día de la semana AAAA-MM-DD en UTC: 0 = domingo ... 6 = sábado. */
function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Fecha AAAA-MM-DD siguiente a la dada. */
function nextDate(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export type DayCountOptions = {
  /** Si un fin de semana no cuenta como día de vacación (ver
   * AppSettingsDTO.excludeWeekendsFromVacationDays). */
  excludeWeekends: boolean;
  /** Fechas (nacionales + personalizadas) que tampoco cuentan — ver
   * holidays/service.ts::getHolidayDateSetForYears. */
  holidayDates: Set<string>;
};

/**
 * Días de vacación entre dos fechas AAAA-MM-DD (ambos extremos
 * incluidos) que sí cuentan para el saldo: los fines de semana (si
 * excludeWeekends) y los festivos nunca cuentan, sea cual sea el rango
 * pedido.
 */
export function countVacationDays(
  startDate: string,
  endDate: string,
  options: DayCountOptions,
): number {
  let count = 0;
  for (let date = startDate; date <= endDate; date = nextDate(date)) {
    const isWeekend = options.excludeWeekends && (dayOfWeek(date) === 0 || dayOfWeek(date) === 6);
    if (!isWeekend && !options.holidayDates.has(date)) {
      count++;
    }
  }
  return count;
}
