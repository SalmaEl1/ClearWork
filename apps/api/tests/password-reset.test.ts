import { randomBytes, createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createPasswordResetToken } from "../src/modules/auth/passwordResetRepository.js";
import { app, closePool, createAdmin, createUserViaAdmin } from "./helpers.js";

// Mismo algoritmo que auth/service.ts (hashResetToken, no exportada): el
// token en claro solo existe en el correo real, así que el test genera el
// suyo propio y lo guarda ya hasheado, igual que haría forgotPassword().
function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

describe("recuperación de contraseña", () => {
  afterAll(closePool);

  it("forgot-password responde igual exista o no la cuenta (sin filtrar cuáles existen)", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");

    const existing = await request(app).post("/api/auth/forgot-password").send({ email: worker.email });
    const missing = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "no-existe-nadie-con-este-email@test.clearwork.dev" });

    expect(existing.status).toBe(200);
    expect(missing.status).toBe(200);
    expect(existing.body.message).toBe(missing.body.message);
  });

  it("un token válido permite cambiar la contraseña, y la vieja deja de servir", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await createPasswordResetToken(worker.id, hashResetToken(token), expiresAt);

    const newPassword = "UnaClaveNuevaDeVerdad123";
    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword });
    expect(resetRes.status).toBe(204);

    const loginOld = await request(app)
      .post("/api/auth/login")
      .send({ email: worker.email, password: worker.password });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app)
      .post("/api/auth/login")
      .send({ email: worker.email, password: newPassword });
    expect(loginNew.status).toBe(200);
  });

  it("un token ya usado no se puede reutilizar", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await createPasswordResetToken(worker.id, hashResetToken(token), expiresAt);

    const first = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "PrimeraClaveNueva123" });
    expect(first.status).toBe(204);

    const second = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "SegundaClaveNueva123" });
    expect(second.status).toBe(400);
  });

  it("un token caducado se rechaza", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() - 1000); // ya caducado
    await createPasswordResetToken(worker.id, hashResetToken(token), expiresAt);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "OtraClaveNueva123" });
    expect(res.status).toBe(400);
  });

  it("un token que no existe se rechaza", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: randomBytes(32).toString("hex"), newPassword: "OtraClaveNueva123" });
    expect(res.status).toBe(400);
  });
});
