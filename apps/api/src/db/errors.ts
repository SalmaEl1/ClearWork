/** Código de error de PostgreSQL para "unique_violation". */
const UNIQUE_VIOLATION = "23505";

/** Código de error de PostgreSQL para "foreign_key_violation". */
const FOREIGN_KEY_VIOLATION = "23503";

function hasPgErrorCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === code
  );
}

/**
 * Detecta si un error lanzado por `pg` es un choque contra una restricción
 * UNIQUE (incluidos los índices únicos parciales, como los que garantizan
 * "una jornada abierta" o "una pausa abierta" por usuario). Necesario
 * porque, bajo una condición de carrera real, el INSERT perdedor no falla
 * en la comprobación previa del servicio, sino aquí.
 */
export function isUniqueViolation(err: unknown): boolean {
  return hasPgErrorCode(err, UNIQUE_VIOLATION);
}

/**
 * Detecta si un `DELETE` chocó contra una clave ajena `ON DELETE RESTRICT`
 * (p. ej. borrar un supervisor que todavía tiene proyectos, o cualquier
 * usuario con historial de cambios de estado en tareas). Se traduce a un
 * 409 con un mensaje claro en vez de dejar pasar el error crudo de `pg`.
 */
export function isForeignKeyViolation(err: unknown): boolean {
  return hasPgErrorCode(err, FOREIGN_KEY_VIOLATION);
}
