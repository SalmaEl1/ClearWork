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
  loginAs,
} from "./helpers.js";

/** Deja listo un supervisor con un trabajador ya en su equipo: el punto
 * de partida de los tests del historial de equipo (issue #101). */
async function setupTeam(adminToken: string) {
  const supervisor = await createUserViaAdmin(adminToken, "supervisor");
  const supervisorToken = await loginAs(supervisor.email, supervisor.password);
  const project = await createProjectViaAdmin(adminToken, supervisor.id);
  const worker = await createWorker(adminToken);
  await request(app)
    .post(`/api/admin/projects/${project.id}/members`)
    .set(...authHeader(adminToken))
    .send({ userId: worker.id });
  return { supervisor, supervisorToken, worker };
}

describe("fichaje", () => {
  afterAll(closePool);

  it("fichar entrada crea una jornada abierta, y no se puede duplicar", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const first = await request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token));
    expect(first.status).toBe(201);
    expect(first.body.endedAt).toBeNull();

    const second = await request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token));
    expect(second.status).toBe(409);

    const active = await request(app).get("/api/work-sessions/active").set(...authHeader(worker.token));
    expect(active.status).toBe(200);
    expect(active.body.activeSession.id).toBe(first.body.id);
  });

  it("no se puede fichar salida sin haber fichado entrada", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app).post("/api/work-sessions/clock-out").set(...authHeader(worker.token));
    expect(res.status).toBe(409);
  });

  it("fichar salida cierra la jornada y cualquier pausa que hubiera quedado abierta", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token));
    await request(app)
      .post("/api/work-sessions/breaks/start")
      .set(...authHeader(worker.token))
      .send({ type: "lunch" });

    const closed = await request(app).post("/api/work-sessions/clock-out").set(...authHeader(worker.token));
    expect(closed.status).toBe(200);
    expect(closed.body.endedAt).not.toBeNull();
    expect(closed.body.breaks).toHaveLength(1);
    expect(closed.body.breaks[0].endedAt).not.toBeNull();

    const active = await request(app).get("/api/work-sessions/active").set(...authHeader(worker.token));
    expect(active.body.activeSession).toBeNull();
  });

  it("pausas: exigen jornada abierta, no se pueden duplicar, y no se pueden terminar sin estar abiertas", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const withoutSession = await request(app)
      .post("/api/work-sessions/breaks/start")
      .set(...authHeader(worker.token))
      .send({ type: "lunch" });
    expect(withoutSession.status).toBe(409);

    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token));

    const withoutOpenBreak = await request(app)
      .post("/api/work-sessions/breaks/end")
      .set(...authHeader(worker.token));
    expect(withoutOpenBreak.status).toBe(409);

    const started = await request(app)
      .post("/api/work-sessions/breaks/start")
      .set(...authHeader(worker.token))
      .send({ type: "ergonomic" });
    expect(started.status).toBe(200);

    const duplicate = await request(app)
      .post("/api/work-sessions/breaks/start")
      .set(...authHeader(worker.token))
      .send({ type: "lunch" });
    expect(duplicate.status).toBe(409);

    const ended = await request(app).post("/api/work-sessions/breaks/end").set(...authHeader(worker.token));
    expect(ended.status).toBe(200);
    expect(ended.body.breaks[0].endedAt).not.toBeNull();
  });

  it("el historial devuelve las jornadas ya cerradas", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token));
    const closed = await request(app).post("/api/work-sessions/clock-out").set(...authHeader(worker.token));

    const history = await request(app).get("/api/work-sessions").set(...authHeader(worker.token));
    expect(history.status).toBe(200);
    expect(history.body.some((s: { id: string }) => s.id === closed.body.id)).toBe(true);
  });

  it("concurrencia: varios fichajes de entrada a la vez dejan como mucho una jornada abierta", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token)),
      ),
    );

    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(7);

    const active = await request(app).get("/api/work-sessions/active").set(...authHeader(worker.token));
    expect(active.body.activeSession.id).toBe(successes[0]!.body.id);
  });

  it("un supervisor consulta el historial de fichajes de alguien de su equipo", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    await request(app).post("/api/work-sessions/clock-in").set(...authHeader(worker.token));
    const closed = await request(app).post("/api/work-sessions/clock-out").set(...authHeader(worker.token));

    const history = await request(app)
      .get(`/api/work-sessions/team/${worker.id}`)
      .set(...authHeader(supervisorToken));
    expect(history.status).toBe(200);
    expect(history.body.some((s: { id: string }) => s.id === closed.body.id)).toBe(true);
  });

  it("un supervisor no puede consultar el historial de alguien que no es de su equipo", async () => {
    const admin = await createAdmin();
    const outsider = await createWorker(admin.token);
    const { supervisorToken } = await setupTeam(admin.token);

    const res = await request(app)
      .get(`/api/work-sessions/team/${outsider.id}`)
      .set(...authHeader(supervisorToken));
    expect(res.status).toBe(404);
  });

  it("un trabajador no puede consultar el historial de fichajes de nadie por esta vía", async () => {
    const admin = await createAdmin();
    const { worker } = await setupTeam(admin.token);

    const res = await request(app)
      .get(`/api/work-sessions/team/${worker.id}`)
      .set(...authHeader(worker.token));
    expect(res.status).toBe(403);
  });
});
