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

async function createTrainingViaAdmin(adminToken: string, title = "Prevención de riesgos") {
  const res = await request(app)
    .post("/api/trainings")
    .set(...authHeader(adminToken))
    .send({ title });
  return res.body;
}

describe("catálogo de formaciones y asignación", () => {
  afterAll(closePool);

  it("un admin crea y lista una formación en el catálogo", async () => {
    const admin = await createAdmin();

    const created = await request(app)
      .post("/api/trainings")
      .set(...authHeader(admin.token))
      .send({ title: "Atención al cliente" });
    expect(created.status).toBe(201);

    const list = await request(app).get("/api/trainings").set(...authHeader(admin.token));
    expect(list.status).toBe(200);
    expect(list.body.some((t: { title: string }) => t.title === "Atención al cliente")).toBe(true);
  });

  it("un supervisor puede ver el catálogo, pero no crear ni borrar formaciones", async () => {
    const admin = await createAdmin();
    const training = await createTrainingViaAdmin(admin.token);
    const { supervisorToken } = await setupTeam(admin.token);

    const list = await request(app).get("/api/trainings").set(...authHeader(supervisorToken));
    expect(list.status).toBe(200);

    const create = await request(app)
      .post("/api/trainings")
      .set(...authHeader(supervisorToken))
      .send({ title: "Otra" });
    expect(create.status).toBe(403);

    const del = await request(app)
      .delete(`/api/trainings/${training.id}`)
      .set(...authHeader(supervisorToken));
    expect(del.status).toBe(403);
  });

  it("un supervisor asigna una formación a alguien de su equipo", async () => {
    const admin = await createAdmin();
    const training = await createTrainingViaAdmin(admin.token);
    const { supervisorToken, worker } = await setupTeam(admin.token);

    const res = await request(app)
      .post("/api/training-assignments")
      .set(...authHeader(supervisorToken))
      .send({ trainingId: training.id, userId: worker.id });

    expect(res.status).toBe(201);
    expect(res.body.trainingId).toBe(training.id);
    expect(res.body.userId).toBe(worker.id);
  });

  it("un supervisor no puede asignar una formación a quien no es de su equipo", async () => {
    const admin = await createAdmin();
    const training = await createTrainingViaAdmin(admin.token);
    const outsider = await createWorker(admin.token);
    const { supervisorToken } = await setupTeam(admin.token);

    const res = await request(app)
      .post("/api/training-assignments")
      .set(...authHeader(supervisorToken))
      .send({ trainingId: training.id, userId: outsider.id });

    expect(res.status).toBe(404);
  });

  it("el trabajador ve su formación asignada, y el supervisor la ve en la lista de su equipo", async () => {
    const admin = await createAdmin();
    const training = await createTrainingViaAdmin(admin.token);
    const { supervisorToken, worker } = await setupTeam(admin.token);
    await request(app)
      .post("/api/training-assignments")
      .set(...authHeader(supervisorToken))
      .send({ trainingId: training.id, userId: worker.id });

    const mine = await request(app)
      .get("/api/training-assignments/mine")
      .set(...authHeader(worker.token));
    expect(mine.status).toBe(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].trainingTitle).toBe(training.title);

    const team = await request(app)
      .get("/api/training-assignments/team")
      .set(...authHeader(supervisorToken));
    expect(team.status).toBe(200);
    expect(team.body[0].userFullName).toBe(worker.fullName);
  });

  it("un supervisor puede quitar una asignación de su equipo", async () => {
    const admin = await createAdmin();
    const training = await createTrainingViaAdmin(admin.token);
    const { supervisorToken, worker } = await setupTeam(admin.token);
    const assigned = await request(app)
      .post("/api/training-assignments")
      .set(...authHeader(supervisorToken))
      .send({ trainingId: training.id, userId: worker.id });

    const del = await request(app)
      .delete(`/api/training-assignments/${assigned.body.id}`)
      .set(...authHeader(supervisorToken));
    expect(del.status).toBe(204);

    const mine = await request(app)
      .get("/api/training-assignments/mine")
      .set(...authHeader(worker.token));
    expect(mine.body).toHaveLength(0);
  });

  it("borrar una formación del catálogo también borra sus asignaciones", async () => {
    const admin = await createAdmin();
    const training = await createTrainingViaAdmin(admin.token);
    const { supervisorToken, worker } = await setupTeam(admin.token);
    await request(app)
      .post("/api/training-assignments")
      .set(...authHeader(supervisorToken))
      .send({ trainingId: training.id, userId: worker.id });

    const del = await request(app)
      .delete(`/api/trainings/${training.id}`)
      .set(...authHeader(admin.token));
    expect(del.status).toBe(204);

    const mine = await request(app)
      .get("/api/training-assignments/mine")
      .set(...authHeader(worker.token));
    expect(mine.body).toHaveLength(0);
  });
});
