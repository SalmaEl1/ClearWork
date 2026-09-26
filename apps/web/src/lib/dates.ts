/** Fecha de hoy en formato AAAA-MM-DD (huso horario local del
 * navegador), para comparar directamente con el valor de un
 * <input type="date"> sin tener que parsear cadenas a Date. */
export function todayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Todas las fechas AAAA-MM-DD de sábado o domingo de un año — usado por
 * WorkerVacations.tsx (vacaciones) y WorkerAbsences.tsx (ausencias
 * puntuales) para no dejar elegir fin de semana en el mini-calendario. */
export function weekendDatesForYear(year: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(year, 0, 1));
  while (cursor.getUTCFullYear() === year) {
    const day = cursor.getUTCDay();
    if (day === 0 || day === 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** true si la fecha (AAAA-MM-DD) cae en sábado o domingo — para validar
 * una fecha escrita a mano (que no pasa por disabledDates del
 * mini-calendario), en vez de recalcular el año entero solo para un día. */
export function isWeekend(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return weekday === 0 || weekday === 6;
}
