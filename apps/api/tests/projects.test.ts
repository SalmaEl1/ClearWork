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
  loginAs,
} from "./helpers.js";

describe("proyectos", () => {
  afterAll(closePool);

  it("el admin crea un proyecto con un supervisor válido", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");

    const res = await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({
        name: "Proyecto nuevo",
        supervisorId: supervisor.id,
        clientName: "Acme S.L.",
        clientContact: "contacto@acme.test",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Proyecto nuevo");
    expect(res.body.supervisorId).toBe(supervisor.id);
    expect(res.body.isArchived).toBe(false);
    expect(res.body.clientName).toBe("Acme S.L.");
    expect(res.body.clientContact).toBe("contacto@acme.test");
  });

  it("no se puede crear un proyecto sin los datos del cliente", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");

    const res = await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({ name: "Sin cliente", supervisorId: supervisor.id });

    expect(res.status).toBe(400);
  });

  it("el admin da de alta los datos del cliente al crear un proyecto, y los puede editar después", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");

    const created = await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({
        name: "Con cliente",
        supervisorId: supervisor.id,
        clientName: "Acme S.L.",
        clientContact: "contacto@acme.test",
      });
    expect(created.status).toBe(201);
    expect(created.body.clientName).toBe("Acme S.L.");
    expect(created.body.clientContact).toBe("contacto@acme.test");

    const updated = await request(app)
      .patch(`/api/admin/projects/${created.body.id}`)
      .set(...authHeader(admin.token))
      .send({ clientName: "Acme Corp.", clientContact: "nuevo@acme.test" });
    expect(updated.status).toBe(200);
    expect(updated.body.clientName).toBe("Acme Corp.");
    expect(updated.body.clientContact).toBe("nuevo@acme.test");
  });

  it("un supervisor no puede cambiar los datos del cliente de su propio proyecto", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    const res = await request(app)
      .patch(`/api/supervisor/projects/${project.id}`)
      .set(...authHeader(supervisorToken))
      .send({ clientName: "Intento de cambio" });

    // El propio esquema del supervisor no reconoce clientName: se trata
    // como "ningún campo válido para actualizar".
    expect(res.status).toBe(400);
  });

  it("crear un proyecto notifica al supervisor asignado", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);

    await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({
        name: "Proyecto notificado",
        supervisorId: supervisor.id,
        clientName: "Acme S.L.",
        clientContact: "contacto@acme.test",
      });

    const notifications = await request(app)
      .get("/api/notifications")
      .set(...authHeader(supervisorToken));
    expect(
      notifications.body.items.some((n: { type: string }) => n.type === "project_assigned"),
    ).toBe(true);
  });

  it("no se puede crear un proyecto con un supervisorId que no es de un supervisor", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({
        name: "Proyecto inválido",
        supervisorId: worker.id,
        clientName: "Acme S.L.",
        clientContact: "contacto@acme.test",
      });

    expect(res.status).toBe(400);
  });

  it("un supervisor no puede tener dos proyectos activos a la vez", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    await createProjectViaAdmin(admin.token, supervisor.id);

    const res = await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({
        name: "Segundo proyecto",
        supervisorId: supervisor.id,
        clientName: "Acme S.L.",
        clientContact: "contacto@acme.test",
      });

    expect(res.status).toBe(409);
  });

  it("un supervisor sí puede recibir un proyecto nuevo si el que tenía está archivado", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const oldProject = await createProjectViaAdmin(admin.token, supervisor.id);
    await request(app)
      .patch(`/api/admin/projects/${oldProject.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });

    const res = await request(app)
      .post("/api/admin/projects")
      .set(...authHeader(admin.token))
      .send({
        name: "Proyecto nuevo",
        supervisorId: supervisor.id,
        clientName: "Acme S.L.",
        clientContact: "contacto@acme.test",
      });

    expect(res.status).toBe(201);
  });

  it("no se puede reasignar un proyecto activo a un supervisor que ya tiene otro activo", async () => {
    const admin = await createAdmin();
    const busySupervisor = await createUserViaAdmin(admin.token, "supervisor");
    await createProjectViaAdmin(admin.token, busySupervisor.id);
    const freeSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, freeSupervisor.id);

    const res = await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ supervisorId: busySupervisor.id });

    expect(res.status).toBe(409);
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

  it("reasignar un proyecto notifica al nuevo supervisor", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const otherSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const otherSupervisorToken = await loginAs(otherSupervisor.email, otherSupervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ supervisorId: otherSupervisor.id });

    const notifications = await request(app)
      .get("/api/notifications")
      .set(...authHeader(otherSupervisorToken));
    expect(
      notifications.body.items.some((n: { type: string }) => n.type === "project_assigned"),
    ).toBe(true);
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
    // Dos supervisores distintos: un supervisor tiene como mucho un
    // proyecto activo a la vez, así que no valdría reutilizar el mismo
    // para projectA y projectB aquí.
    const supervisorA = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorB = await createUserViaAdmin(admin.token, "supervisor");
    const projectA = await createProjectViaAdmin(admin.token, supervisorA.id);
    const projectB = await createProjectViaAdmin(admin.token, supervisorB.id);
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

  it("el supervisor puede editar el nombre y la descripción de su propio proyecto", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    const res = await request(app)
      .patch(`/api/supervisor/projects/${project.id}`)
      .set(...authHeader(supervisorToken))
      .send({ name: "Renombrado por el supervisor", description: "Nueva descripción" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renombrado por el supervisor");
    expect(res.body.description).toBe("Nueva descripción");
  });

  it("el supervisor no puede reasignar el supervisor de su proyecto ni archivarlo por esta vía", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const otherSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    // Solo con supervisorId/isArchived en el body: el esquema los descarta
    // en silencio (no son campos válidos para este endpoint) y no queda
    // ningún campo real que actualizar, así que debe rechazarse con 400.
    const onlyForbiddenFields = await request(app)
      .patch(`/api/supervisor/projects/${project.id}`)
      .set(...authHeader(supervisorToken))
      .send({ supervisorId: otherSupervisor.id, isArchived: true });
    expect(onlyForbiddenFields.status).toBe(400);

    // Combinado con un campo válido: el nombre sí cambia, pero
    // supervisorId se descarta sin más, no se propaga.
    const combined = await request(app)
      .patch(`/api/supervisor/projects/${project.id}`)
      .set(...authHeader(supervisorToken))
      .send({ name: "Nombre nuevo", supervisorId: otherSupervisor.id });
    expect(combined.status).toBe(200);
    expect(combined.body.name).toBe("Nombre nuevo");
    expect(combined.body.supervisorId).toBe(supervisor.id);
  });

  it("un supervisor no puede editar el proyecto de otro supervisor", async () => {
    const admin = await createAdmin();
    const owner = await createUserViaAdmin(admin.token, "supervisor");
    const intruder = await createUserViaAdmin(admin.token, "supervisor");
    const intruderToken = await loginAs(intruder.email, intruder.password);
    const project = await createProjectViaAdmin(admin.token, owner.id);

    const res = await request(app)
      .patch(`/api/supervisor/projects/${project.id}`)
      .set(...authHeader(intruderToken))
      .send({ name: "Intento ajeno" });

    expect(res.status).toBe(404);
  });

  it("el supervisor puede asignar y quitar miembros de su propio proyecto", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);

    const assigned = await request(app)
      .post(`/api/supervisor/projects/${project.id}/members`)
      .set(...authHeader(supervisorToken))
      .send({ userId: worker.id });
    expect(assigned.status).toBe(200);
    expect(assigned.body.members.map((m: { userId: string }) => m.userId)).toContain(worker.id);

    const removed = await request(app)
      .delete(`/api/supervisor/projects/${project.id}/members/${worker.id}`)
      .set(...authHeader(supervisorToken));
    expect(removed.status).toBe(200);
    expect(removed.body.members.map((m: { userId: string }) => m.userId)).not.toContain(worker.id);
  });

  it("un supervisor no puede tocar los miembros de un proyecto ajeno", async () => {
    const admin = await createAdmin();
    const owner = await createUserViaAdmin(admin.token, "supervisor");
    const intruder = await createUserViaAdmin(admin.token, "supervisor");
    const intruderToken = await loginAs(intruder.email, intruder.password);
    const project = await createProjectViaAdmin(admin.token, owner.id);
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post(`/api/supervisor/projects/${project.id}/members`)
      .set(...authHeader(intruderToken))
      .send({ userId: worker.id });

    expect(res.status).toBe(404);
  });

  it("la lista de trabajadores para asignar refleja su proyecto actual", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    const unassignedWorker = await createWorker(admin.token);
    await request(app)
      .post(`/api/supervisor/projects/${project.id}/members`)
      .set(...authHeader(supervisorToken))
      .send({ userId: worker.id });

    const res = await request(app)
      .get("/api/supervisor/projects/workers")
      .set(...authHeader(supervisorToken));

    expect(res.status).toBe(200);
    const assignedEntry = res.body.find((w: { id: string }) => w.id === worker.id);
    expect(assignedEntry.currentProjectId).toBe(project.id);
    expect(assignedEntry).not.toHaveProperty("currentProjectName");
    const unassignedEntry = res.body.find((w: { id: string }) => w.id === unassignedWorker.id);
    expect(unassignedEntry.currentProjectId).toBeNull();
  });

  it("el supervisor puede ver el detalle de un proyecto propio, pero no el de uno ajeno", async () => {
    const admin = await createAdmin();
    const owner = await createUserViaAdmin(admin.token, "supervisor");
    const intruder = await createUserViaAdmin(admin.token, "supervisor");
    const ownerToken = await loginAs(owner.email, owner.password);
    const intruderToken = await loginAs(intruder.email, intruder.password);
    const project = await createProjectViaAdmin(admin.token, owner.id);

    const own = await request(app)
      .get(`/api/supervisor/projects/${project.id}`)
      .set(...authHeader(ownerToken));
    expect(own.status).toBe(200);
    expect(own.body.id).toBe(project.id);
    expect(own.body.members).toEqual([]);

    const foreign = await request(app)
      .get(`/api/supervisor/projects/${project.id}`)
      .set(...authHeader(intruderToken));
    expect(foreign.status).toBe(404);
  });

  it("un trabajador puede ver el proyecto del que es miembro, con los datos del cliente incluidos", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ clientName: "Acme S.L.", clientContact: "contacto@acme.test" });
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    const res = await request(app).get("/api/worker/project").set(...authHeader(worker.token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(project.id);
    expect(res.body.clientName).toBe("Acme S.L.");
    expect(res.body.clientContact).toBe("contacto@acme.test");
  });

  it("un trabajador sin proyecto asignado recibe 404 al consultar su proyecto", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app).get("/api/worker/project").set(...authHeader(worker.token));

    expect(res.status).toBe(404);
  });

  it("un supervisor no puede consultar /api/worker/project (es exclusivo del trabajador)", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);

    const res = await request(app).get("/api/worker/project").set(...authHeader(supervisorToken));

    expect(res.status).toBe(403);
  });
});
