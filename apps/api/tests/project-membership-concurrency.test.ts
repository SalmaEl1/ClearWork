import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { pool } from "../src/db/pool.js";
import {
  app,
  authHeader,
  closePool,
  createAdmin,
  createProjectViaAdmin,
  createUserViaAdmin,
} from "./helpers.js";

describe("un trabajador está como mucho en un proyecto a la vez", () => {
  afterAll(closePool);

  it("asignaciones concurrentes a proyectos distintos dejan una única membresía activa", async () => {
    const admin = await createAdmin();
    const sup1 = await createUserViaAdmin(admin.token, "supervisor");
    const sup2 = await createUserViaAdmin(admin.token, "supervisor");
    const worker = await createUserViaAdmin(admin.token, "worker");

    const projectA = await createProjectViaAdmin(admin.token, sup1.id);
    const projectB = await createProjectViaAdmin(admin.token, sup2.id);

    // Ráfaga de asignaciones concurrentes al mismo trabajador,
    // alternando entre los dos proyectos: sin el advisory lock de
    // reassignMembership (ver projects/repository.ts), esto podría dejar
    // dos filas de membresía activas a la vez.
    const requests = Array.from({ length: 8 }, (_, i) => {
      const projectId = i % 2 === 0 ? projectA.id : projectB.id;
      return request(app)
        .post(`/api/admin/projects/${projectId}/members`)
        .set(...authHeader(admin.token))
        .send({ userId: worker.id });
    });
    const results = await Promise.all(requests);

    for (const res of results) {
      expect(res.status).toBe(200);
    }

    const { rows } = await pool.query<{ project_id: string }>(
      "SELECT project_id FROM project_members WHERE user_id = $1 AND left_at IS NULL",
      [worker.id],
    );
    expect(rows).toHaveLength(1);
    expect([projectA.id, projectB.id]).toContain(rows[0]?.project_id);
  });
});
