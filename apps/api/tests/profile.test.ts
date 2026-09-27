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

describe("perfil (GET/PATCH /api/auth/me)", () => {
  afterAll(closePool);

  it("un trabajador sin proyecto asignado ve supervisorName a null en /me", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app).get("/api/auth/me").set(...authHeader(worker.token));

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("worker");
    expect(res.body.supervisorName).toBeNull();
  });

  it("un trabajador con proyecto asignado ve el nombre de su supervisor en /me", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor", "Supervisora Test");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    const res = await request(app).get("/api/auth/me").set(...authHeader(worker.token));

    expect(res.status).toBe(200);
    expect(res.body.supervisorName).toBe("Supervisora Test");
  });

  it("un admin o supervisor nunca tiene supervisorName (solo aplica a workers)", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);

    const res = await request(app).get("/api/auth/me").set(...authHeader(supervisorToken));

    expect(res.status).toBe(200);
    expect(res.body.supervisorName).toBeNull();
  });

  it("PATCH /api/auth/me permite renombrarse", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .patch("/api/auth/me")
      .set(...authHeader(worker.token))
      .send({ fullName: "Nuevo Nombre" });

    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe("Nuevo Nombre");
  });

  it("PATCH /api/auth/me permite cambiar el email a uno libre", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const newEmail = `nuevo-${Date.now()}@test.clearwork.dev`;

    const res = await request(app)
      .patch("/api/auth/me")
      .set(...authHeader(worker.token))
      .send({ email: newEmail });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(newEmail);

    const loginWithNewEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: newEmail, password: worker.password });
    expect(loginWithNewEmail.status).toBe(200);
  });

  it("PATCH /api/auth/me rechaza el email si ya lo usa otra cuenta", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const other = await createUserViaAdmin(admin.token, "worker");

    const res = await request(app)
      .patch("/api/auth/me")
      .set(...authHeader(worker.token))
      .send({ email: other.email });

    expect(res.status).toBe(409);
  });

  it("PATCH /api/auth/me deja el email intacto si se envía el mismo que ya tenía", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .patch("/api/auth/me")
      .set(...authHeader(worker.token))
      .send({ email: worker.email, fullName: "Mismo email" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(worker.email);
  });

  it("PATCH /api/auth/me sin ningún campo da 400", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .patch("/api/auth/me")
      .set(...authHeader(worker.token))
      .send({});

    expect(res.status).toBe(400);
  });

  it("un token de una cuenta ya eliminada da 401 en /me", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");
    const workerToken = await loginAs(worker.email, worker.password);

    const del = await request(app)
      .delete(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token));
    expect(del.status).toBe(204);

    const res = await request(app).get("/api/auth/me").set(...authHeader(workerToken));
    expect(res.status).toBe(401);
  });

  it("un token de una cuenta ya eliminada da 401 al intentar actualizar el perfil", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");
    const workerToken = await loginAs(worker.email, worker.password);

    const del = await request(app)
      .delete(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token));
    expect(del.status).toBe(204);

    const res = await request(app)
      .patch("/api/auth/me")
      .set(...authHeader(workerToken))
      .send({ fullName: "Ya no existo" });
    expect(res.status).toBe(401);
  });
});
