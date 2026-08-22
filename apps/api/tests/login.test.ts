import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authHeader, closePool, createAdmin, createWorker } from "./helpers.js";

describe("login", () => {
  afterAll(closePool);

  it("credenciales correctas devuelven un token y los datos del usuario", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: admin.email, password: admin.password });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe(admin.email);
    expect(res.body.user.role).toBe("admin");
    // El token debe servir para autenticarse en otro endpoint.
    const me = await request(app).get("/api/auth/me").set(...authHeader(res.body.token));
    expect(me.status).toBe(200);
  });

  it("contraseña incorrecta da 401 con mensaje genérico", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: admin.email, password: "ContraseñaMala1234" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Email o contraseña incorrectos");
  });

  it("un email que no existe da el mismo 401 genérico (no delata si la cuenta existe)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-existe@test.clearwork.dev", password: "cualquiera1234" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Email o contraseña incorrectos");
  });

  it("una cuenta desactivada no puede iniciar sesión, con el mismo mensaje genérico", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    await request(app)
      .patch(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token))
      .send({ isActive: false });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: worker.email, password: worker.password });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Email o contraseña incorrectos");
  });

  it("un email con formato inválido no llega a comprobar credenciales (400)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-es-un-email", password: "cualquiera1234" });

    expect(res.status).toBe(400);
  });
});
