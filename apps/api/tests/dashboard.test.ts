import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { pool } from "../src/db/pool.js";
import {
  app,
  authHeader,
  closePool,
  createAdmin,
  createProjectViaAdmin,
  createUserViaAdmin,
  createWorker,
  loginAs,
} from "./helpers.js";

/** Adelanta el inicio de la jornada abierta de `userId` `hours` horas
 * hacia atrás, para poder comprobar el cálculo de horas trabajadas sin
 * tener que esperar tiempo real en el test. */
async function backdateOpenSession(userId: string, hours: number): Promise<void> {
  await pool.query(
    `UPDATE work_sessions SET started_at = started_at - ($2 || ' hours')::interval
     WHERE user_id = $1 AND ended_at IS NULL`,
    [userId, hours],
  );
}

async function createWorkerWithTarget(adminToken: string, weeklyTargetHours: number) {
  const res = await request(app)
    .post("/api/admin/users")
    .set(...authHeader(adminToken))
    .send({
      email: `dash-${Math.random().toString(36).slice(2)}@test.clearwork.dev`,
      fullName: "Worker con objetivo",
      role: "worker",
      weeklyTargetHours,
    });
  const token = await loginAs(res.body.email, res.body.temporaryPassword);
  return { ...res.body, token };
}

afterAll(closePool);

describe("dashboard del trabajador", () => {
  it("sin fichar, no hay horas trabajadas y el estado es ok", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app).get("/api/dashboard/worker").set(...authHeader(worker.token));

    expect(res.status).toBe(200);
    expect(res.body.workedHours).toBe(0);
    expect(res.body.isClockedIn).toBe(false);
    expect(res.body.isOnBreak).toBe(false);
    expect(res.body.status).toBe("ok");
  });

  it("fichar entrada y una pausa se reflejan en isClockedIn/isOnBreak", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token));
    const afterClockIn = await request(app)
      .get("/api/dashboard/worker")
      .set(...authHeader(worker.token));
    expect(afterClockIn.body.isClockedIn).toBe(true);
    expect(afterClockIn.body.isOnBreak).toBe(false);

    await request(app)
      .post("/api/work-sessions/breaks/start")
      .set(...authHeader(worker.token))
      .send({ type: "lunch" });
    const onBreak = await request(app)
      .get("/api/dashboard/worker")
      .set(...authHeader(worker.token));
    expect(onBreak.body.isClockedIn).toBe(true);
    expect(onBreak.body.isOnBreak).toBe(true);

    await request(app).post("/api/work-sessions/breaks/end").set(...authHeader(worker.token));
    const afterBreak = await request(app)
      .get("/api/dashboard/worker")
      .set(...authHeader(worker.token));
    expect(afterBreak.body.isOnBreak).toBe(false);
  });

  it("las horas trabajadas se calculan desde el inicio real de la jornada", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token));
    await backdateOpenSession(worker.id, 2);
    await request(app).post("/api/work-sessions/clock-out").set(...authHeader(worker.token));

    const res = await request(app).get("/api/dashboard/worker").set(...authHeader(worker.token));
    expect(res.status).toBe(200);
    expect(res.body.workedHours).toBeGreaterThan(1.9);
    expect(res.body.workedHours).toBeLessThan(2.1);
    expect(res.body.isClockedIn).toBe(false);
  });

  it("cerca del objetivo semanal el estado pasa a near_limit, y por encima a over_limit", async () => {
    const admin = await createAdmin();

    const nearLimitWorker = await createWorkerWithTarget(admin.token, 2);
    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(nearLimitWorker.token));
    await backdateOpenSession(nearLimitWorker.id, 1.9);
    await request(app).post("/api/work-sessions/clock-out").set(...authHeader(nearLimitWorker.token));
    const nearLimit = await request(app)
      .get("/api/dashboard/worker")
      .set(...authHeader(nearLimitWorker.token));
    expect(nearLimit.body.status).toBe("near_limit");

    const overLimitWorker = await createWorkerWithTarget(admin.token, 1);
    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(overLimitWorker.token));
    await backdateOpenSession(overLimitWorker.id, 2);
    await request(app).post("/api/work-sessions/clock-out").set(...authHeader(overLimitWorker.token));
    const overLimit = await request(app)
      .get("/api/dashboard/worker")
      .set(...authHeader(overLimitWorker.token));
    expect(overLimit.body.status).toBe("over_limit");
  });
});

describe("dashboard del supervisor", () => {
  it("el estado del equipo refleja si están fichados y de pausa", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const workerA = await createWorker(admin.token);
    const workerB = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: workerA.id });
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: workerB.id });

    const beforeAnyone = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));
    expect(beforeAnyone.status).toBe(200);
    const teamBefore = beforeAnyone.body.team as Array<{ id: string; status: string }>;
    expect(teamBefore.find((m) => m.id === workerA.id)?.status).toBe("offline");

    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(workerA.token));
    const afterClockIn = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));
    const teamAfterClockIn = afterClockIn.body.team as Array<{ id: string; status: string }>;
    expect(teamAfterClockIn.find((m) => m.id === workerA.id)?.status).toBe("working");
    expect(teamAfterClockIn.find((m) => m.id === workerB.id)?.status).toBe("offline");

    await request(app)
      .post("/api/work-sessions/breaks/start")
      .set(...authHeader(workerA.token))
      .send({ type: "lunch" });
    const onBreak = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));
    const teamOnBreak = onBreak.body.team as Array<{ id: string; status: string }>;
    expect(teamOnBreak.find((m) => m.id === workerA.id)?.status).toBe("on_break");
  });

  it("muestra en qué tarea está trabajando cada persona conectada", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    const task = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Preparar demo" });

    await request(app)
      .post("/api/work-sessions/clock-in")
      .set(...authHeader(worker.token))
      .send({ taskId: task.body.id });

    const withTask = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));
    const entryWithTask = withTask.body.team.find((m: { id: string }) => m.id === worker.id);
    expect(entryWithTask.status).toBe("working");
    expect(entryWithTask.activeTaskTitle).toBe("Preparar demo");

    await request(app)
      .post("/api/work-sessions/task")
      .set(...authHeader(worker.token))
      .send({});

    const withoutTask = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));
    const entryWithoutTask = withoutTask.body.team.find((m: { id: string }) => m.id === worker.id);
    expect(entryWithoutTask.activeTaskTitle).toBeNull();
  });

  it("el resumen de tareas por proyecto cuenta correctamente cada estado", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Pendiente" });
    const t2 = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "En curso" });
    const t3 = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Hecha" });

    await request(app)
      .patch(`/api/tasks/${t2.body.id}/status`)
      .set(...authHeader(supervisorToken))
      .send({ status: "in_progress" });
    await request(app)
      .patch(`/api/tasks/${t3.body.id}/status`)
      .set(...authHeader(supervisorToken))
      .send({ status: "done" });

    const res = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));
    const summary = res.body.projects.find((p: { projectId: string }) => p.projectId === project.id);
    expect(summary.pending).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.done).toBe(1);
  });
});
