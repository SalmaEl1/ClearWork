import type { BreakType, WorkSessionDTO } from "@clearwork/shared";
import { isUniqueViolation } from "../../db/errors.js";
import { ConflictError } from "../../shared/errors.js";
import { calculateWorkedMinutes } from "../../shared/time.js";
import * as repo from "./repository.js";
import type { BreakRow, WorkSessionRow } from "./types.js";

function toBreakDTO(row: BreakRow) {
  return {
    id: row.id,
    workSessionId: row.work_session_id,
    type: row.type,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at ? row.ended_at.toISOString() : null,
  };
}

function toSessionDTO(session: WorkSessionRow, breaks: BreakRow[]): WorkSessionDTO {
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
  };
}

export async function clockIn(userId: string): Promise<WorkSessionDTO> {
  const open = await repo.findOpenSessionForUser(userId);
  if (open) {
    throw new ConflictError("Ya tienes una jornada abierta");
  }

  try {
    const session = await repo.createSession(userId);
    return toSessionDTO(session, []);
  } catch (err) {
    // Dos peticiones de "fichar entrada" a la vez pueden pasar la
    // comprobación anterior las dos; el índice único de la base de datos
    // es la garantía real, y aquí traducimos su rechazo a un 409 normal.
    if (isUniqueViolation(err)) {
      throw new ConflictError("Ya tienes una jornada abierta");
    }
    throw err;
  }
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

  const closed = await repo.closeSession(userId, now);
  if (!closed) {
    throw new ConflictError("No tienes ninguna jornada abierta");
  }

  const breaks = await repo.listBreaksForSession(closed.id);
  return toSessionDTO(closed, breaks);
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
  return toSessionDTO(open, breaks);
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
  return toSessionDTO(open, breaks);
}

export async function getActiveSession(userId: string): Promise<WorkSessionDTO | null> {
  const open = await repo.findOpenSessionForUser(userId);
  if (!open) return null;

  const breaks = await repo.listBreaksForSession(open.id);
  return toSessionDTO(open, breaks);
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

  return sessions.map((s) => toSessionDTO(s, breaksBySession.get(s.id) ?? []));
}
