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
} from "./helpers.js";

describe("proyectos", () => {
  afterAll(closePool);

  it("el admin crea un proyecto con un supervisor válido", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");

    const res = await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({ name: "Proyecto nuevo", supervisorId: supervisor.id });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Proyecto nuevo");
    expect(res.body.supervisorId).toBe(supervisor.id);
    expect(res.body.isArchived).toBe(false);
  });

  it("no se puede crear un proyecto con un supervisorId que no es de un supervisor", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({ name: "Proyecto inválido", supervisorId: worker.id });

    expect(res.status).toBe(400);
  });

  it("editar un proyecto permite renombrar, archivar y cambiar de supervisor", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const otherSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    const renamed = await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ name: "Nombre nuevo" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("Nombre nuevo");

    const archived = await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });
    expect(archived.status).toBe(200);
    expect(archived.body.isArchived).toBe(true);

    const reassigned = await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ supervisorId: otherSupervisor.id });
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.supervisorId).toBe(otherSupervisor.id);
  });

  it("asignar un miembro lo añade al equipo del proyecto", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    expect(res.status).toBe(200);
    expect(res.body.members.map((m: { userId: string }) => m.userId)).toContain(worker.id);
  });

  it("no se puede asignar como miembro a alguien que no es trabajador", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const anotherSupervisor = await createUserViaAdmin(admin.token, "supervisor");

    const res = await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: anotherSupervisor.id });

    expect(res.status).toBe(400);
  });

  it("no se puede asignar gente a un proyecto archivado", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });

    const res = await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    expect(res.status).toBe(409);
  });

  it("reasignar a un trabajador que ya estaba en otro proyecto lo mueve, no lo duplica", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const projectA = await createProjectViaAdmin(admin.token, supervisor.id);
    const projectB = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);

    await request(app)
      .post(`/api/admin/projects/${projectA.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    await request(app)
      .post(`/api/admin/projects/${projectB.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    const detailA = await request(app)
      .get(`/api/admin/projects/${projectA.id}`)
      .set(...authHeader(admin.token));
    const detailB = await request(app)
      .get(`/api/admin/projects/${projectB.id}`)
      .set(...authHeader(admin.token));

    expect(detailA.body.members).toHaveLength(0);
    expect(detailB.body.members.map((m: { userId: string }) => m.userId)).toContain(worker.id);
  });

  it("quitar a un miembro lo saca del proyecto", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    const res = await request(app)
      .delete(`/api/admin/projects/${project.id}/members/${worker.id}`)
      .set(...authHeader(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.members.map((m: { userId: string }) => m.userId)).not.toContain(worker.id);
  });

  it("quitar a alguien que no está en el proyecto da 404", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .delete(`/api/admin/projects/${project.id}/members/${worker.id}`)
      .set(...authHeader(admin.token));
    expect(res.status).toBe(404);
  });

  it("borrar un proyecto lo elimina", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    const del = await request(app)
      .delete(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token));
    expect(del.status).toBe(204);

    const detail = await request(app)
      .get(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token));
    expect(detail.status).toBe(404);
  });
});
