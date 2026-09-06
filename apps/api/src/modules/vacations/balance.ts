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

/** Días naturales entre dos fechas AAAA-MM-DD, ambos extremos incluidos. */
export function daySpan(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}
