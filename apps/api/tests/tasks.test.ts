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

/** Deja listo un supervisor con proyecto y un trabajador ya asignado a
 * ese proyecto: el punto de partida de casi todos los tests de tareas. */
async function setupProjectWithMember(adminToken: string) {
  const supervisor = await createUserViaAdmin(adminToken, "supervisor");
  const supervisorToken = await loginAs(supervisor.email, supervisor.password);
  const project = await createProjectViaAdmin(adminToken, supervisor.id);
  const worker = await createWorker(adminToken);
  await request(app)
    .post(`/api/admin/projects/${project.id}/members`)
    .set(...authHeader(adminToken))
    .send({ userId: worker.id });
  return { supervisor, supervisorToken, project, worker };
}

describe("tareas", () => {
  afterAll(closePool);

  it("un supervisor crea una tarea en su proyecto, asignada a un miembro", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);

    const res = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Preparar demo" });

    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe(project.id);
    expect(res.body.assigneeId).toBe(worker.id);
    expect(res.body.status).toBe("pending");
  });

  it("no se puede crear una tarea en un proyecto que no es del supervisor", async () => {
    const admin = await createAdmin();
    const { supervisorToken } = await setupProjectWithMember(admin.token);
    const otherSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const otherProject = await createProjectViaAdmin(admin.token, otherSupervisor.id);

    const res = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: otherProject.id, title: "Intento ajeno" });

    expect(res.status).toBe(400);
  });

  it("no se puede crear una tarea en un proyecto archivado", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project } = await setupProjectWithMember(admin.token);
    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });

    const res = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, title: "Tarea en archivado" });

    expect(res.status).toBe(409);
  });

  it("no se puede asignar una tarea a alguien que no es miembro del proyecto", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project } = await setupProjectWithMember(admin.token);
    const outsider = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: outsider.id, title: "Tarea mal asignada" });

    expect(res.status).toBe(400);
  });

  it("un trabajador no puede crear, editar ni borrar tareas", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Tarea" });

    const createAttempt = await request(app)
      .post("/api/tasks")
      .set(...authHeader(worker.token))
      .send({ projectId: project.id, title: "No debería poder" });
    expect(createAttempt.status).toBe(403);

    const editAttempt = await request(app)
      .patch(`/api/tasks/${created.body.id}`)
      .set(...authHeader(worker.token))
      .send({ title: "Cambiado" });
    expect(editAttempt.status).toBe(403);

    const deleteAttempt = await request(app)
      .delete(`/api/tasks/${created.body.id}`)
      .set(...authHeader(worker.token));
    expect(deleteAttempt.status).toBe(403);
  });

  it("el trabajador solo ve sus tareas, el supervisor ve las de su equipo", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const otherWorker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: otherWorker.id });

    await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Para worker" });
    await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: otherWorker.id, title: "Para otherWorker" });

    const workerList = await request(app).get("/api/tasks").set(...authHeader(worker.token));
    expect(workerList.status).toBe(200);
    expect(workerList.body).toHaveLength(1);
    expect(workerList.body[0].title).toBe("Para worker");

    const supervisorList = await request(app)
      .get("/api/tasks")
      .set(...authHeader(supervisorToken));
    expect(supervisorList.status).toBe(200);
    expect(supervisorList.body).toHaveLength(2);
  });

  it("editar una tarea permite cambiar título y reasignarla", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const otherWorker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: otherWorker.id });

    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Original" });

    const updated = await request(app)
      .patch(`/api/tasks/${created.body.id}`)
      .set(...authHeader(supervisorToken))
      .send({ title: "Actualizada", assigneeId: otherWorker.id });

    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("Actualizada");
    expect(updated.body.assigneeId).toBe(otherWorker.id);
  });

  it("cambiar el estado de una tarea queda registrado en su historial, con quién lo cambió", async () => {
    const admin = await createAdmin();
    const { supervisor, supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Con historial" });

    const byWorker = await request(app)
      .patch(`/api/tasks/${created.body.id}/status`)
      .set(...authHeader(worker.token))
      .send({ status: "in_progress" });
    expect(byWorker.status).toBe(200);
    expect(byWorker.body.status).toBe("in_progress");

    const bySupervisor = await request(app)
      .patch(`/api/tasks/${created.body.id}/status`)
      .set(...authHeader(supervisorToken))
      .send({ status: "done" });
    expect(bySupervisor.status).toBe(200);

    const detail = await request(app)
      .get(`/api/tasks/${created.body.id}`)
      .set(...authHeader(supervisorToken));
    expect(detail.status).toBe(200);
    expect(detail.body.statusHistory).toHaveLength(2);
    expect(detail.body.statusHistory[0].toStatus).toBe("in_progress");
    expect(detail.body.statusHistory[0].changedByName).toBe(worker.fullName);
    expect(detail.body.statusHistory[1].toStatus).toBe("done");
    expect(detail.body.statusHistory[1].changedByName).toBe(supervisor.fullName);
  });

  it("borrar una tarea la quita del listado y de detalle (404)", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "A borrar" });

    const del = await request(app)
      .delete(`/api/tasks/${created.body.id}`)
      .set(...authHeader(supervisorToken));
    expect(del.status).toBe(204);

    const detail = await request(app)
      .get(`/api/tasks/${created.body.id}`)
      .set(...authHeader(supervisorToken));
    expect(detail.status).toBe(404);
  });

  it("una tarea nueva empieza al 0% de avance", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);

    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Nueva" });

    expect(created.body.progressPercentage).toBe(0);
  });

  it("el trabajador asignado y el supervisor pueden actualizar el porcentaje de avance", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Con avance" });

    const byWorker = await request(app)
      .patch(`/api/tasks/${created.body.id}/progress`)
      .set(...authHeader(worker.token))
      .send({ progressPercentage: 40 });
    expect(byWorker.status).toBe(200);
    expect(byWorker.body.progressPercentage).toBe(40);

    const bySupervisor = await request(app)
      .patch(`/api/tasks/${created.body.id}/progress`)
      .set(...authHeader(supervisorToken))
      .send({ progressPercentage: 75 });
    expect(bySupervisor.status).toBe(200);
    expect(bySupervisor.body.progressPercentage).toBe(75);
  });

  it("el porcentaje de avance se rechaza fuera de 0-100", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Con límites" });

    const tooHigh = await request(app)
      .patch(`/api/tasks/${created.body.id}/progress`)
      .set(...authHeader(supervisorToken))
      .send({ progressPercentage: 101 });
    expect(tooHigh.status).toBe(400);

    const negative = await request(app)
      .patch(`/api/tasks/${created.body.id}/progress`)
      .set(...authHeader(supervisorToken))
      .send({ progressPercentage: -1 });
    expect(negative.status).toBe(400);
  });

  it("un trabajador no puede tocar el avance de una tarea que no es suya", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const outsider = await createWorker(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Ajena" });

    const res = await request(app)
      .patch(`/api/tasks/${created.body.id}/progress`)
      .set(...authHeader(outsider.token))
      .send({ progressPercentage: 50 });

    expect(res.status).toBe(404);
  });
});
