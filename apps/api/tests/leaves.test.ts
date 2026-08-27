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

/** Deja listo un supervisor con un trabajador ya en su equipo: el punto
 * de partida de casi todos los tests de bajas. */
async function setupTeam(adminToken: string) {
  const supervisor = await createUserViaAdmin(adminToken, "supervisor");
  const supervisorToken = (await request(app).post("/api/auth/login").send({
    email: supervisor.email,
    password: supervisor.password,
  })).body.token as string;
  const project = await createProjectViaAdmin(adminToken, supervisor.id);
  const worker = await createWorker(adminToken);
  await request(app)
    .post(`/api/admin/projects/${project.id}/members`)
    .set(...authHeader(adminToken))
    .send({ userId: worker.id });
  return { supervisor, supervisorToken, project, worker };
}

describe("bajas y ausencias prolongadas", () => {
  afterAll(closePool);

  it("un admin da de alta una baja a cualquier persona", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/leaves")
      .set(...authHeader(admin.token))
      .send({ userId: worker.id, type: "sick_leave", startDate: isoDateOffset(0) });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(worker.id);
    expect(res.body.type).toBe("sick_leave");
    expect(res.body.endDate).toBeNull();
  });

  it("un trabajador no puede dar de alta ninguna baja, ni la suya propia", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/leaves")
      .set(...authHeader(worker.token))
      .send({ userId: worker.id, type: "sick_leave", startDate: isoDateOffset(0) });

    expect(res.status).toBe(403);
  });

  it("un supervisor da de alta una baja a alguien de su equipo", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    const res = await request(app)
      .post("/api/leaves")
      .set(...authHeader(supervisorToken))
      .send({
        userId: worker.id,
        type: "maternity_paternity",
        startDate: isoDateOffset(-2),
        endDate: isoDateOffset(30),
      });

    expect(res.status).toBe(201);
    expect(res.body.endDate).toBe(isoDateOffset(30));
  });

  it("un supervisor no puede dar de alta una baja a quien no es de su equipo", async () => {
    const admin = await createAdmin();
    const outsider = await createWorker(admin.token);
    const { supervisorToken } = await setupTeam(admin.token);

    const res = await request(app)
      .post("/api/leaves")
      .set(...authHeader(supervisorToken))
      .send({ userId: outsider.id, type: "sick_leave", startDate: isoDateOffset(0) });

    expect(res.status).toBe(404);
  });

  it("rechaza una fecha de fin anterior a la de inicio", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/leaves")
      .set(...authHeader(admin.token))
      .send({
        userId: worker.id,
        type: "temporary_leave",
        startDate: isoDateOffset(0),
        endDate: isoDateOffset(-1),
      });

    expect(res.status).toBe(400);
  });

  it("lista, y luego borra, las bajas de una persona", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const created = await request(app)
      .post("/api/leaves")
      .set(...authHeader(admin.token))
      .send({ userId: worker.id, type: "sick_leave", startDate: isoDateOffset(0) });

    const listed = await request(app)
      .get(`/api/leaves?userId=${worker.id}`)
      .set(...authHeader(admin.token));
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    const del = await request(app)
      .delete(`/api/leaves/${created.body.id}`)
      .set(...authHeader(admin.token));
    expect(del.status).toBe(204);

    const listedAfter = await request(app)
      .get(`/api/leaves?userId=${worker.id}`)
      .set(...authHeader(admin.token));
    expect(listedAfter.body).toHaveLength(0);
  });

  it("un supervisor no puede listar ni borrar bajas de quien no es de su equipo", async () => {
    const admin = await createAdmin();
    const outsider = await createWorker(admin.token);
    const outsiderLeave = await request(app)
      .post("/api/leaves")
      .set(...authHeader(admin.token))
      .send({ userId: outsider.id, type: "sick_leave", startDate: isoDateOffset(0) });
    const { supervisorToken } = await setupTeam(admin.token);

    const list = await request(app)
      .get(`/api/leaves?userId=${outsider.id}`)
      .set(...authHeader(supervisorToken));
    expect(list.status).toBe(404);

    const del = await request(app)
      .delete(`/api/leaves/${outsiderLeave.body.id}`)
      .set(...authHeader(supervisorToken));
    expect(del.status).toBe(404);
  });

  it("el dashboard del supervisor marca 'on_leave' a quien tiene una baja en vigor hoy", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    await request(app)
      .post("/api/leaves")
      .set(...authHeader(supervisorToken))
      .send({ userId: worker.id, type: "maternity_paternity", startDate: isoDateOffset(-1) });

    const dashboard = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));

    expect(dashboard.status).toBe(200);
    const teamEntry = dashboard.body.team.find((t: { id: string }) => t.id === worker.id);
    expect(teamEntry.status).toBe("on_leave");
    expect(teamEntry.leaveType).toBe("maternity_paternity");
  });

  it("una baja que ya terminó no afecta al estado actual", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    await request(app)
      .post("/api/leaves")
      .set(...authHeader(supervisorToken))
      .send({
        userId: worker.id,
        type: "sick_leave",
        startDate: isoDateOffset(-10),
        endDate: isoDateOffset(-5),
      });

    const dashboard = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));

    const teamEntry = dashboard.body.team.find((t: { id: string }) => t.id === worker.id);
    expect(teamEntry.status).not.toBe("on_leave");
    expect(teamEntry.leaveType).toBeNull();
  });
});
