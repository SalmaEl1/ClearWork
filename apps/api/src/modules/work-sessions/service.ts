import type { BreakType, TaskSegmentDTO, WorkSessionDTO } from "@clearwork/shared";
import { isUniqueViolation } from "../../db/errors.js";
import { BadRequestError, ConflictError } from "../../shared/errors.js";
import { calculateWorkedMinutes } from "../../shared/time.js";
import { findTaskById, findTaskForWorker } from "../tasks/repository.js";
import * as repo from "./repository.js";
import type { BreakRow, TaskSegmentRow, WorkSessionRow } from "./types.js";

function toBreakDTO(row: BreakRow) {
  return {
    id: row.id,
    workSessionId: row.work_session_id,
    type: row.type,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at ? row.ended_at.toISOString() : null,
  };
}

/** Título de cada tarea referenciada por un grupo de segmentos, en una
 * sola tanda de consultas (una jornada normal tiene pocos cambios de
 * tarea, así que no hace falta una consulta por lote en la base de
 * datos para esto). */
async function getTaskTitles(segments: TaskSegmentRow[]): Promise<Map<string, string>> {
  const taskIds = [...new Set(segments.map((s) => s.task_id).filter((id): id is string => id !== null))];
  const tasks = await Promise.all(taskIds.map((id) => findTaskById(id)));
  return new Map(tasks.filter((t) => t !== null).map((t) => [t.id, t.title]));
}

function toSegmentDTO(row: TaskSegmentRow, titleById: Map<string, string>): TaskSegmentDTO {
  return {
    id: row.id,
    workSessionId: row.work_session_id,
    taskId: row.task_id,
    taskTitle: row.task_id ? (titleById.get(row.task_id) ?? null) : null,
    description: row.description,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at ? row.ended_at.toISOString() : null,
  };
}

async function toSessionDTO(
  session: WorkSessionRow,
  breaks: BreakRow[],
  segments: TaskSegmentRow[],
): Promise<WorkSessionDTO> {
  const titleById = await getTaskTitles(segments);
  return {
    id: session.id,
    userId: session.user_id,
    startedAt: session.started_at.toISOString(),
    endedAt: session.ended_at ? session.ended_at.toISOString() : null,
    workedMinutes: calculateWorkedMinutes(
      session.started_at,
      session.ended_at,
      breaks.map((b) => ({
        type: b.type,
        startedAt: b.started_at,
        endedAt: b.ended_at,
      })),
    ),
    breaks: breaks.map(toBreakDTO),
    taskSegments: segments.map((s) => toSegmentDTO(s, titleById)),
  };
}

/** Si se indica taskId, exige que sea una tarea asignada a este
 * trabajador: fichar sobre la tarea de otro no tiene sentido y además
 * dejaría ver, por el título devuelto, que esa tarea existe. */
async function assertOwnTaskIfProvided(taskId: string | null | undefined, userId: string): Promise<void> {
  if (!taskId) return;
  const task = await findTaskForWorker(taskId, userId);
  if (!task) throw new BadRequestError("taskId debe ser una tarea asignada a este trabajador");
}

export async function clockIn(
  userId: string,
  input: { taskId?: string | null; description?: string | null } = {},
): Promise<WorkSessionDTO> {
  const open = await repo.findOpenSessionForUser(userId);
  if (open) {
    throw new ConflictError("Ya tienes una jornada abierta");
  }

  await assertOwnTaskIfProvided(input.taskId, userId);

  let session: WorkSessionRow;
  try {
    session = await repo.createSession(userId);
  } catch (err) {
    // Dos peticiones de "fichar entrada" a la vez pueden pasar la
    // comprobación anterior las dos; el índice único de la base de datos
    // es la garantía real, y aquí traducimos su rechazo a un 409 normal.
    if (isUniqueViolation(err)) {
      throw new ConflictError("Ya tienes una jornada abierta");
    }
    throw err;
  }

  const segments: TaskSegmentRow[] = [];
  if (input.taskId || input.description) {
    segments.push(await repo.createSegment(session.id, input.taskId ?? null, input.description ?? null));
  }

  return toSessionDTO(session, [], segments);
}

export async function clockOut(userId: string): Promise<WorkSessionDTO> {
  const open = await repo.findOpenSessionForUser(userId);
  if (!open) {
    throw new ConflictError("No tienes ninguna jornada abierta");
  }

  const now = new Date();

  const openBreak = await repo.findOpenBreakForSession(open.id);
  if (openBreak) {
    // Fichar la salida cierra cualquier pausa que hubiera quedado abierta.
    await repo.closeBreak(open.id, now);
  }
  // Igual que con la pausa: fichar la salida cierra el tramo de tarea en
  // curso, si había uno.
  await repo.closeOpenSegment(open.id, now);

  const closed = await repo.closeSession(userId, now);
  if (!closed) {
    throw new ConflictError("No tienes ninguna jornada abierta");
  }

  const breaks = await repo.listBreaksForSession(closed.id);
  const segments = await repo.listSegmentsForSession(closed.id);
  return toSessionDTO(closed, breaks, segments);
}

export async function switchTask(
  userId: string,
  input: { taskId?: string | null; description?: string | null },
): Promise<WorkSessionDTO> {
  const open = await repo.findOpenSessionForUser(userId);
  if (!open) {
    throw new ConflictError("Tienes que fichar entrada antes de elegir en qué tarea trabajar");
  }

  await assertOwnTaskIfProvided(input.taskId, userId);

  await repo.closeOpenSegment(open.id, new Date());
  if (input.taskId || input.description) {
    await repo.createSegment(open.id, input.taskId ?? null, input.description ?? null);
  }

  const breaks = await repo.listBreaksForSession(open.id);
  const segments = await repo.listSegmentsForSession(open.id);
  return toSessionDTO(open, breaks, segments);
}

export async function startBreak(userId: string, type: BreakType): Promise<WorkSessionDTO> {
  const open = await repo.findOpenSessionForUser(userId);
  if (!open) {
    throw new ConflictError("Tienes que fichar entrada antes de iniciar una pausa");
  }

  const existingBreak = await repo.findOpenBreakForSession(open.id);
  if (existingBreak) {
    throw new ConflictError("Ya tienes una pausa abierta");
  }

  try {
    await repo.createBreak(open.id, type);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError("Ya tienes una pausa abierta");
    }
    throw err;
  }

  const breaks = await repo.listBreaksForSession(open.id);
  const segments = await repo.listSegmentsForSession(open.id);
  return toSessionDTO(open, breaks, segments);
}

export async function endBreak(userId: string): Promise<WorkSessionDTO> {
  const open = await repo.findOpenSessionForUser(userId);
  if (!open) {
    throw new ConflictError("No tienes ninguna jornada abierta");
  }

  const existingBreak = await repo.findOpenBreakForSession(open.id);
  if (!existingBreak) {
    throw new ConflictError("No tienes ninguna pausa abierta");
  }

  await repo.closeBreak(open.id, new Date());
  const breaks = await repo.listBreaksForSession(open.id);
  const segments = await repo.listSegmentsForSession(open.id);
  return toSessionDTO(open, breaks, segments);
}

export async function getActiveSession(userId: string): Promise<WorkSessionDTO | null> {
  const open = await repo.findOpenSessionForUser(userId);
  if (!open) return null;

  const breaks = await repo.listBreaksForSession(open.id);
  const segments = await repo.listSegmentsForSession(open.id);
  return toSessionDTO(open, breaks, segments);
}

export async function getHistory(userId: string, limit: number): Promise<WorkSessionDTO[]> {
  const sessions = await repo.listSessionsForUser(userId, limit);
  if (sessions.length === 0) return [];

  const allBreaks = await repo.listBreaksForSessions(sessions.map((s) => s.id));
  const breaksBySession = new Map<string, BreakRow[]>();
  for (const b of allBreaks) {
    const list = breaksBySession.get(b.work_session_id) ?? [];
    list.push(b);
    breaksBySession.set(b.work_session_id, list);
  }

  const allSegments = await repo.listSegmentsForSessions(sessions.map((s) => s.id));
  const segmentsBySession = new Map<string, TaskSegmentRow[]>();
  for (const s of allSegments) {
    const list = segmentsBySession.get(s.work_session_id) ?? [];
    list.push(s);
    segmentsBySession.set(s.work_session_id, list);
  }

  return Promise.all(
    sessions.map((s) =>
      toSessionDTO(s, breaksBySession.get(s.id) ?? [], segmentsBySession.get(s.id) ?? []),
    ),
  );
}
