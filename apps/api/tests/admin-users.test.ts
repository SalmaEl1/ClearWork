import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authHeader, closePool, createAdmin, uniqueEmail } from "./helpers.js";

describe("fecha de contratación de una cuenta", () => {
  afterAll(closePool);

  it("el admin debe indicar la fecha de contratación al crear una cuenta", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post("/api/admin/users")
      .set(...authHeader(admin.token))
      .send({ email: uniqueEmail("worker"), fullName: "Sin fecha", role: "worker" });

    expect(res.status).toBe(400);
  });

  it("crea la cuenta con la fecha de contratación indicada", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post("/api/admin/users")
      .set(...authHeader(admin.token))
      .send({
        email: uniqueEmail("worker"),
        fullName: "Con fecha",
        role: "worker",
        hireDate: "2026-03-15",
      });

    expect(res.status).toBe(201);
    expect(res.body.hireDate).toBe("2026-03-15");
  });

  it("el admin puede corregir la fecha de contratación de una cuenta ya creada", async () => {
    const admin = await createAdmin();
    const created = await request(app)
      .post("/api/admin/users")
      .set(...authHeader(admin.token))
      .send({
        email: uniqueEmail("worker"),
        fullName: "A corregir",
        role: "worker",
        hireDate: "2026-03-15",
      });

    const updated = await request(app)
      .patch(`/api/admin/users/${created.body.id}`)
      .set(...authHeader(admin.token))
      .send({ hireDate: "2025-11-01" });

    expect(updated.status).toBe(200);
    expect(updated.body.hireDate).toBe("2025-11-01");
  });
});
