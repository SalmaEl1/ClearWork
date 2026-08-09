/** Código de error de PostgreSQL para "unique_violation". */
const UNIQUE_VIOLATION = "23505";

/**
 * Detecta si un error lanzado por `pg` es un choque contra una restricción
 * UNIQUE (incluidos los índices únicos parciales, como los que garantizan
 * "una jornada abierta" o "una pausa abierta" por usuario). Necesario
 * porque, bajo una condición de carrera real, el INSERT perdedor no falla
 * en la comprobación previa del servicio, sino aquí.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === UNIQUE_VIOLATION
  );
}
