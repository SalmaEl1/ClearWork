import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authHeader, closePool, createAdmin, createUserViaAdmin } from "./helpers.js";

describe("autoprotección del admin", () => {
  afterAll(closePool);

  it("un admin no puede eliminar su propia cuenta", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .delete(`/api/admin/users/${admin.user.id}`)
      .set(...authHeader(admin.token));

    expect(res.status).toBe(403);
  });

  it("un admin no puede desactivar su propia cuenta", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .patch(`/api/admin/users/${admin.user.id}`)
      .set(...authHeader(admin.token))
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });

  it("un admin no puede cambiar su propio rol", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .patch(`/api/admin/users/${admin.user.id}`)
      .set(...authHeader(admin.token))
      .send({ role: "supervisor" });

    expect(res.status).toBe(403);
  });

  it("un admin sí puede eliminar la cuenta de otro admin", async () => {
    const admin = await createAdmin();
    const other = await createUserViaAdmin(admin.token, "admin");

    const res = await request(app)
      .delete(`/api/admin/users/${other.id}`)
      .set(...authHeader(admin.token));

    expect(res.status).toBe(204);
  });
});
