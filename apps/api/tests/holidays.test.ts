import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authHeader, closePool, createAdmin, createWorker } from "./helpers.js";

describe("festivos", () => {
  afterAll(closePool);

  it("cualquier rol autenticado puede consultar los festivos de un año, incluidos los nacionales", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .get("/api/holidays")
      .query({ year: 2026 })
      .set(...authHeader(worker.token));

    expect(res.status).toBe(200);
    expect(
      res.body.some((h: { date: string; isNational: boolean }) => h.date === "2026-01-01" && h.isNational),
    ).toBe(true);
    expect(
      res.body.some((h: { date: string; isNational: boolean }) => h.date === "2026-12-25" && h.isNational),
    ).toBe(true);
  });

  it("un admin añade un festivo personalizado, y luego lo elimina", async () => {
    const admin = await createAdmin();

    const created = await request(app)
      .post("/api/holidays")
      .set(...authHeader(admin.token))
      .send({ date: "2026-06-15", label: "Puente de la empresa" });
    expect(created.status).toBe(201);
    expect(created.body.isNational).toBe(false);

    const listed = await request(app)
      .get("/api/holidays")
      .query({ year: 2026 })
      .set(...authHeader(admin.token));
    expect(
      listed.body.some((h: { date: string; label: string }) => h.date === "2026-06-15" && h.label === "Puente de la empresa"),
    ).toBe(true);

    const deleted = await request(app)
      .delete(`/api/holidays/${created.body.id}`)
      .set(...authHeader(admin.token));
    expect(deleted.status).toBe(204);

    const listedAfter = await request(app)
      .get("/api/holidays")
      .query({ year: 2026 })
      .set(...authHeader(admin.token));
    expect(listedAfter.body.some((h: { date: string }) => h.date === "2026-06-15")).toBe(false);
  });

  it("un trabajador no puede añadir ni eliminar festivos", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const created = await request(app)
      .post("/api/holidays")
      .set(...authHeader(worker.token))
      .send({ date: "2026-06-16", label: "Intento de trabajador" });
    expect(created.status).toBe(403);
  });

  it("rechaza un festivo personalizado en una fecha que ya es festivo nacional", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post("/api/holidays")
      .set(...authHeader(admin.token))
      .send({ date: "2026-01-01", label: "Duplicado de Año Nuevo" });

    expect(res.status).toBe(409);
  });

  it("rechaza dos festivos personalizados en la misma fecha", async () => {
    const admin = await createAdmin();
    await request(app)
      .post("/api/holidays")
      .set(...authHeader(admin.token))
      .send({ date: "2026-06-17", label: "Primero" });

    const res = await request(app)
      .post("/api/holidays")
      .set(...authHeader(admin.token))
      .send({ date: "2026-06-17", label: "Segundo" });

    expect(res.status).toBe(409);
  });
});
