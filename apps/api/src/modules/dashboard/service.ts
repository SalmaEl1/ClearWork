import type {
  ProjectTaskSummary,
  SupervisorDashboardResponse,
  TeamMemberStatus,
  TeamMemberSummary,
  WeeklyHoursStatus,
  WorkerDashboardResponse,
} from "@clearwork/shared";
import { listProjectsForSupervisor } from "../projects/repository.js";
import { countTaskStatusesForSupervisor } from "../tasks/repository.js";
import { findUserById, listWorkersForSupervisor } from "../users/repository.js";
import {
  findOpenBreakForSession,
  findOpenSessionForUser,
  listBreaksForSessions,
  listOpenSessionsForUsers,
  listSessionsForUserInRange,
  listSessionsForUsersInRange,
} from "../work-sessions/repository.js";
import type { BreakRow, WorkSessionRow } from "../work-sessions/types.js";
import { UnauthorizedError } from "../../shared/errors.js";
import { calculateWorkedMinutes } from "../../shared/time.js";

/** Por debajo del 90% del objetivo semanal no hay alerta. */
const NEAR_LIMIT_RATIO = 0.9;

/**
 * Lunes 00:00 UTC de la semana de `now`, y el lunes siguiente (límite
 * exclusivo). Se calcula en UTC por simplicidad: para una app real con
 * usuarios en distintas zonas horarias, esto habría que ajustarlo a la
 * zona horaria de cada usuario, algo fuera del alcance de este TFG.
 */
function getCurrentWeekRange(now: Date): { start: Date; end: Date } {
  const day = now.getUTCDay(); // domingo=0 ... sábado=6
  const daysSinceMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function sumWorkedMinutes(sessions: WorkSessionRow[], breaksBySession: Map<string, BreakRow[]>): number {
  return sessions.reduce((total, session) => {
    const sessionBreaks = breaksBySession.get(session.id) ?? [];
    return (
      total +
      calculateWorkedMinutes(
        session.started_at,
        session.ended_at,
        sessionBreaks.map((b) => ({
          type: b.type,
          startedAt: b.started_at,
          endedAt: b.ended_at,
        })),
      )
    );
  }, 0);
}

function getWeeklyStatus(workedHours: number, targetHours: number): WeeklyHoursStatus {
  if (targetHours <= 0) return "ok";
  if (workedHours >= targetHours) return "over_limit";
  if (workedHours >= targetHours * NEAR_LIMIT_RATIO) return "near_limit";
  return "ok";
}

export async function getWorkerDashboard(
  userId: string,
  now: Date = new Date(),
): Promise<WorkerDashboardResponse> {
  const user = await findUserById(userId);
  if (!user) throw new UnauthorizedError("El usuario del token ya no existe");

  const { start, end } = getCurrentWeekRange(now);

  const weekSessions = await listSessionsForUserInRange(userId, start, end);
  const weekBreaks = await listBreaksForSessions(weekSessions.map((s) => s.id));
  const breaksBySession = groupBy(weekBreaks, (b) => b.work_session_id);

  const workedHours = sumWorkedMinutes(weekSessions, breaksBySession) / 60;
  const targetHours = Number(user.weekly_target_hours);

  const openSession = await findOpenSessionForUser(userId);
  const openBreak = openSession ? await findOpenBreakForSession(openSession.id) : null;

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    targetHours,
    workedHours,
    status: getWeeklyStatus(workedHours, targetHours),
    isClockedIn: openSession !== null,
    isOnBreak: openBreak !== null,
  };
}

export async function getSupervisorDashboard(
  supervisorId: string,
  now: Date = new Date(),
): Promise<SupervisorDashboardResponse> {
  const workers = await listWorkersForSupervisor(supervisorId);
  const workerIds = workers.map((w) => w.id);

  const { start, end } = getCurrentWeekRange(now);

  const [weekSessions, openSessions, projects, taskCounts] = await Promise.all([
    listSessionsForUsersInRange(workerIds, start, end),
    listOpenSessionsForUsers(workerIds),
    listProjectsForSupervisor(supervisorId),
    countTaskStatusesForSupervisor(supervisorId),
  ]);

  const weekBreaks = await listBreaksForSessions(weekSessions.map((s) => s.id));
  const weekBreaksBySession = groupBy(weekBreaks, (b) => b.work_session_id);
  const weekSessionsByUser = groupBy(weekSessions, (s) => s.user_id);

  const openSessionsByUser = new Map(openSessions.map((s) => [s.user_id, s]));
  const openSessionBreaks = await listBreaksForSessions(openSessions.map((s) => s.id));
  const openBreakBySession = new Map(
    openSessionBreaks.filter((b) => b.ended_at === null).map((b) => [b.work_session_id, b]),
  );

  const team: TeamMemberSummary[] = workers.map((worker) => {
    const hoursThisWeek =
      sumWorkedMinutes(weekSessionsByUser.get(worker.id) ?? [], weekBreaksBySession) / 60;

    const openSession = openSessionsByUser.get(worker.id);
    const openBreak = openSession ? openBreakBySession.get(openSession.id) : undefined;

    let status: TeamMemberStatus = "offline";
    if (openSession) {
      status = openBreak ? "on_break" : "working";
    }

    return {
      id: worker.id,
      fullName: worker.full_name,
      status,
      breakType: openBreak?.type ?? null,
      hoursThisWeek,
    };
  });

  const projectSummaries: ProjectTaskSummary[] = projects.map((project) => {
    const counts = taskCounts.filter((c) => c.project_id === project.id);
    const countFor = (status: string) =>
      Number(counts.find((c) => c.status === status)?.count ?? 0);

    return {
      projectId: project.id,
      projectName: project.name,
      pending: countFor("pending"),
      inProgress: countFor("in_progress"),
      done: countFor("done"),
    };
  });

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    team,
    projects: projectSummaries,
  };
}
