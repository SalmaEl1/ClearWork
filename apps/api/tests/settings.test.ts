import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authHeader, closePool, createAdmin, createWorker } from "./helpers.js";

describe("ajustes", () => {
  // app_settings es una fila singleton que resetTestDb.ts deja fuera del
  // TRUNCATE a propósito (ver ese fichero): lo que se escriba aquí
  // persiste entre ejecuciones de test, así que hay que devolverlo a como
  // estaba al terminar.
  let originalDefaultWeeklyTargetHours: number;

  beforeAll(async () => {
    const admin = await createAdmin();
    const res = await request(app).get("/api/admin/settings").set(...authHeader(admin.token));
    originalDefaultWeeklyTargetHours = res.body.defaultWeeklyTargetHours;
  });

  afterAll(async () => {
    const admin = await createAdmin();
    await request(app)
      .patch("/api/admin/settings")
      .set(...authHeader(admin.token))
      .send({ defaultWeeklyTargetHours: originalDefaultWeeklyTargetHours });
    await closePool();
  });

  it("el admin puede leer los ajustes", async () => {
    const admin = await createAdmin();

    const res = await request(app).get("/api/admin/settings").set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(typeof res.body.defaultWeeklyTargetHours).toBe("number");
    expect(res.body.defaultWeeklyTargetHours).toBeGreaterThan(0);
  });

  it("un trabajador o supervisor no pueden ver ni editar los ajustes", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const getAttempt = await request(app).get("/api/admin/settings").set(...authHeader(worker.token));
    expect(getAttempt.status).toBe(403);

    const patchAttempt = await request(app)
      .patch("/api/admin/settings")
      .set(...authHeader(worker.token))
      .send({ defaultWeeklyTargetHours: 30 });
    expect(patchAttempt.status).toBe(403);
  });

  it("el admin puede cambiar las horas objetivo semanales por defecto", async () => {
    const admin = await createAdmin();

    const updated = await request(app)
      .patch("/api/admin/settings")
      .set(...authHeader(admin.token))
      .send({ defaultWeeklyTargetHours: 35 });
    expect(updated.status).toBe(200);
    expect(updated.body.defaultWeeklyTargetHours).toBe(35);

    const read = await request(app).get("/api/admin/settings").set(...authHeader(admin.token));
    expect(read.body.defaultWeeklyTargetHours).toBe(35);
  });

  it("un valor no positivo se rechaza", async () => {
    const admin = await createAdmin();

    const zero = await request(app)
      .patch("/api/admin/settings")
      .set(...authHeader(admin.token))
      .send({ defaultWeeklyTargetHours: 0 });
    expect(zero.status).toBe(400);

    const negative = await request(app)
      .patch("/api/admin/settings")
      .set(...authHeader(admin.token))
      .send({ defaultWeeklyTargetHours: -5 });
    expect(negative.status).toBe(400);
  });

  it("un trabajador nuevo hereda el objetivo semanal por defecto vigente, si no se le da uno propio", async () => {
    const admin = await createAdmin();
    await request(app)
      .patch("/api/admin/settings")
      .set(...authHeader(admin.token))
      .send({ defaultWeeklyTargetHours: 25 });

    const worker = await createWorker(admin.token);

    expect(worker.weeklyTargetHours).toBe(25);
  });
});
