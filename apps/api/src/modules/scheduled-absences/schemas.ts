import { z } from "zod";
import { todayDateString } from "../../shared/time.js";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createScheduledAbsenceSchema = z
  .object({
    date: z.string().date("date debe tener formato AAAA-MM-DD"),
    startTime: z.string().regex(timePattern, "startTime debe tener formato HH:MM"),
    endTime: z.string().regex(timePattern, "endTime debe tener formato HH:MM"),
    reason: z.string().trim().min(1, "El motivo es obligatorio"),
  })
  .refine((body) => body.endTime > body.startTime, {
    message: "endTime debe ser posterior a startTime",
    path: ["endTime"],
  })
  .refine((body) => body.date >= todayDateString(), {
    message: "date no puede ser anterior a hoy",
    path: ["date"],
  });

/** A diferencia de createScheduledAbsenceSchema: sin la restricción de
 * "hoy o más tarde" — el supervisor puede programar una ausencia en el
 * pasado (para dejar constancia de algo que ya ocurrió) o en el futuro,
 * a diferencia del trabajador, que solo puede programarlas por adelantado. */
export const createTeamScheduledAbsenceSchema = z
  .object({
    userId: z.string().uuid("userId debe ser un UUID válido"),
    date: z.string().date("date debe tener formato AAAA-MM-DD"),
    startTime: z.string().regex(timePattern, "startTime debe tener formato HH:MM"),
    endTime: z.string().regex(timePattern, "endTime debe tener formato HH:MM"),
    reason: z.string().trim().min(1, "El motivo es obligatorio"),
  })
  .refine((body) => body.endTime > body.startTime, {
    message: "endTime debe ser posterior a startTime",
    path: ["endTime"],
  });

/** Igual de permisiva con las fechas que createTeamScheduledAbsenceSchema
 * (el supervisor puede mover una ausencia al pasado o al futuro); si
 * startTime y endTime no vienen juntos en el mismo PATCH, la comparación
 * contra el valor que ya estaba guardado la hace el servicio, no este
 * esquema, que no conoce el estado actual de la fila. */
export const updateScheduledAbsenceSchema = z
  .object({
    date: z.string().date("date debe tener formato AAAA-MM-DD").optional(),
    startTime: z.string().regex(timePattern, "startTime debe tener formato HH:MM").optional(),
    endTime: z.string().regex(timePattern, "endTime debe tener formato HH:MM").optional(),
    reason: z.string().trim().min(1, "El motivo es obligatorio").optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No se ha indicado ningún campo para actualizar",
  });
