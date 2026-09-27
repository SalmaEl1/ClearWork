import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authHeader, closePool, createAdmin, createUserViaAdmin, loginAs } from "./helpers.js";

describe("cambio de contraseña", () => {
  afterAll(closePool);

  it("rechaza la contraseña nueva si es igual a la actual", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");
    const workerToken = await loginAs(worker.email, worker.password);

    const res = await request(app)
      .patch("/api/auth/password")
      .set(...authHeader(workerToken))
      .send({ currentPassword: worker.password, newPassword: worker.password });

    expect(res.status).toBe(400);
  });

  it("rechaza el cambio si la contraseña actual no es correcta", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");
    const workerToken = await loginAs(worker.email, worker.password);

    const res = await request(app)
      .patch("/api/auth/password")
      .set(...authHeader(workerToken))
      .send({ currentPassword: "ContraseñaIncorrecta123", newPassword: "UnaClaveNuevaDistinta123" });

    expect(res.status).toBe(400);

    // La contraseña original sigue funcionando: el cambio no se aplicó.
    const loginStillOld = await request(app)
      .post("/api/auth/login")
      .send({ email: worker.email, password: worker.password });
    expect(loginStillOld.status).toBe(200);
  });

  it("acepta una contraseña nueva distinta e invalida la anterior", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");
    const workerToken = await loginAs(worker.email, worker.password);
    const newPassword = "OtraClaveDistinta123";

    const changeRes = await request(app)
      .patch("/api/auth/password")
      .set(...authHeader(workerToken))
      .send({ currentPassword: worker.password, newPassword });
    expect(changeRes.status).toBe(204);

    const loginWithOld = await request(app)
      .post("/api/auth/login")
      .send({ email: worker.email, password: worker.password });
    expect(loginWithOld.status).toBe(401);

    const loginWithNew = await request(app)
      .post("/api/auth/login")
      .send({ email: worker.email, password: newPassword });
    expect(loginWithNew.status).toBe(200);
  });

  it("un token de una cuenta ya eliminada da 401 al intentar cambiar la contraseña", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");
    const workerToken = await loginAs(worker.email, worker.password);

    const del = await request(app)
      .delete(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token));
    expect(del.status).toBe(204);

    const res = await request(app)
      .patch("/api/auth/password")
      .set(...authHeader(workerToken))
      .send({ currentPassword: worker.password, newPassword: "OtraClaveNuevaValida123" });
    expect(res.status).toBe(401);
  });
});
