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
});
