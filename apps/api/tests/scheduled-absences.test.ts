import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  app,
  authHeader,
  closePool,
  createAdmin,
  createProjectViaAdmin,
  createUserViaAdmin,
  createWorker,
} from "./helpers.js";

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nowTimeString(offsetMinutes = 0): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  return d.toISOString().slice(11, 16);
}

async function setupTeam(adminToken: string) {
  const supervisor = await createUserViaAdmin(adminToken, "supervisor");
  const supervisorToken = (
    await request(app).post("/api/auth/login").send({ email: supervisor.email, password: supervisor.password })
  ).body.token as string;
  const project = await createProjectViaAdmin(adminToken, supervisor.id);
  const worker = await createWorker(adminToken);
  await request(app)
    .post(`/api/admin/projects/${project.id}/members`)
    .set(...authHeader(adminToken))
    .send({ userId: worker.id });
  return { supervisor, supervisorToken, project, worker };
}

describe("ausencias puntuales programadas", () => {
  afterAll(closePool);

  it("un trabajador programa una ausencia puntual", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/scheduled-absences")
      .set(...authHeader(worker.token))
      .send({ date: isoDateOffset(1), startTime: "10:00", endTime: "11:30", reason: "Cita médica" });

    expect(res.status).toBe(201);
    expect(res.body.reason).toBe("Cita médica");
    expect(res.body.startTime).toBe("10:00");
    expect(res.body.endTime).toBe("11:30");
  });

  it("rechaza una fecha anterior a hoy", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/scheduled-absences")
      .set(...authHeader(worker.token))
      .send({ date: isoDateOffset(-1), startTime: "10:00", endTime: "11:00", reason: "Gestión legal" });

    expect(res.status).toBe(400);
  });

  it("rechaza una hora de fin anterior o igual a la de inicio", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/scheduled-absences")
      .set(...authHeader(worker.token))
      .send({ date: isoDateOffset(1), startTime: "10:00", endTime: "09:00", reason: "Gestión legal" });

    expect(res.status).toBe(400);
  });

  it("un supervisor no puede programar una ausencia puntual (es autoservicio del trabajador)", async () => {
    const admin = await createAdmin();
    const { supervisorToken } = await setupTeam(admin.token);

    const res = await request(app)
      .post("/api/scheduled-absences")
      .set(...authHeader(supervisorToken))
      .send({ date: isoDateOffset(1), startTime: "10:00", endTime: "11:00", reason: "Gestión legal" });

    expect(res.status).toBe(403);
  });

  it("lista y borra las ausencias propias", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const created = await request(app)
      .post("/api/scheduled-absences")
      .set(...authHeader(worker.token))
      .send({ date: isoDateOffset(1), startTime: "10:00", endTime: "11:00", reason: "Cita médica" });

    const listed = await request(app).get("/api/scheduled-absences").set(...authHeader(worker.token));
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    const del = await request(app)
      .delete(`/api/scheduled-absences/${created.body.id}`)
      .set(...authHeader(worker.token));
    expect(del.status).toBe(204);
  });

  it("un trabajador no puede borrar la ausencia de otro", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const outsider = await createWorker(admin.token);
    const created = await request(app)
      .post("/api/scheduled-absences")
      .set(...authHeader(worker.token))
      .send({ date: isoDateOffset(1), startTime: "10:00", endTime: "11:00", reason: "Cita médica" });

    const res = await request(app)
      .delete(`/api/scheduled-absences/${created.body.id}`)
      .set(...authHeader(outsider.token));

    expect(res.status).toBe(403);
  });

  it("una ausencia programada para ahora mismo marca 'on_scheduled_absence' en el dashboard del supervisor", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);
    await request(app)
      .post("/api/scheduled-absences")
      .set(...authHeader(worker.token))
      .send({
        date: isoDateOffset(0),
        startTime: nowTimeString(-30),
        endTime: nowTimeString(30),
        reason: "Cita médica",
      });

    const dashboard = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));

    const teamEntry = dashboard.body.team.find((t: { id: string }) => t.id === worker.id);
    expect(teamEntry.status).toBe("on_scheduled_absence");
    expect(teamEntry.scheduledAbsenceReason).toBe("Cita médica");
  });

  it("una ausencia programada para más tarde no afecta al estado actual", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);
    await request(app)
      .post("/api/scheduled-absences")
      .set(...authHeader(worker.token))
      .send({
        date: isoDateOffset(0),
        startTime: nowTimeString(120),
        endTime: nowTimeString(180),
        reason: "Cita médica",
      });

    const dashboard = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));

    const teamEntry = dashboard.body.team.find((t: { id: string }) => t.id === worker.id);
    expect(teamEntry.status).not.toBe("on_scheduled_absence");
  });
});
