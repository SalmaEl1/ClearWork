import type { BreakType } from "@clearwork/shared";

/**
 * Qué tipos de pausa cuentan como tiempo trabajado. El descanso ergonómico
 * (visual) se considera trabajo efectivo; la pausa de comer, no. Cambiar
 * este criterio es modificar esta constante, nada más.
 */
export const BREAK_COUNTS_AS_WORKED: Record<BreakType, boolean> = {
  ergonomic: true,
  lunch: false,
};

export type BreakInterval = {
  type: BreakType;
  startedAt: Date;
  endedAt: Date | null;
};

/**
 * Minutos trabajados de una jornada: su duración total menos las pausas
 * que no cuentan como trabajo. Si la jornada o alguna pausa sigue abierta,
 * se calcula hasta `now`, lo que permite mostrar el progreso de una
 * jornada en curso.
 */
export function calculateWorkedMinutes(
  startedAt: Date,
  endedAt: Date | null,
  breaks: BreakInterval[],
  now: Date = new Date(),
): number {
  const sessionEnd = endedAt ?? now;
  const totalMs = sessionEnd.getTime() - startedAt.getTime();

  const nonWorkedBreakMs = breaks
    .filter((b) => !BREAK_COUNTS_AS_WORKED[b.type])
    .reduce((sum, b) => {
      const breakEnd = b.endedAt ?? now;
      return sum + (breakEnd.getTime() - b.startedAt.getTime());
    }, 0);

  const workedMs = Math.max(0, totalMs - nonWorkedBreakMs);
  return Math.round(workedMs / 60_000);
}

/** Fecha de hoy en formato AAAA-MM-DD, comparable directamente con una
 * columna DATE (que `pool.ts` deja como cadena, sin convertir a Date). */
export function todayDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Hora actual en formato HH:MM (UTC), comparable con una columna TIME.
 * Misma simplificación que getCurrentWeekRange en dashboard/service.ts:
 * en una app real habría que ajustarlo a la zona horaria de cada
 * usuario, fuera del alcance de este TFG. */
export function nowTimeString(now: Date = new Date()): string {
  return now.toISOString().slice(11, 16);
}
