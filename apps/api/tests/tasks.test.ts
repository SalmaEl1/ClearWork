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

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
    expect(workerList.body.items).toHaveLength(1);
    expect(workerList.body.items[0].title).toBe("Para worker");
    expect(workerList.body.total).toBe(1);

    const supervisorList = await request(app)
      .get("/api/tasks")
      .set(...authHeader(supervisorToken));
    expect(supervisorList.status).toBe(200);
    expect(supervisorList.body.items).toHaveLength(2);
    expect(supervisorList.body.total).toBe(2);
  });

  it("pagina el listado de tareas, con 10 por página por defecto", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    for (let i = 0; i < 12; i++) {
      await request(app)
        .post("/api/tasks")
        .set(...authHeader(supervisorToken))
        .send({ projectId: project.id, assigneeId: worker.id, title: `Tarea ${i}` });
    }

    const firstPage = await request(app)
      .get("/api/tasks")
      .set(...authHeader(worker.token));
    expect(firstPage.body.items).toHaveLength(10);
    expect(firstPage.body.total).toBe(12);
    expect(firstPage.body.page).toBe(1);
    expect(firstPage.body.pageSize).toBe(10);

    const secondPage = await request(app)
      .get("/api/tasks?page=2")
      .set(...authHeader(worker.token));
    expect(secondPage.body.items).toHaveLength(2);
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
    // El primer punto es siempre la creación (issue #108), sintetizada a
    // partir de la propia tarea, no una fila más del historial.
    expect(detail.body.history).toHaveLength(3);
    expect(detail.body.history[0].kind).toBe("created");
    expect(detail.body.history[0].changedByName).toBe(supervisor.fullName);
    expect(detail.body.history[1].kind).toBe("status");
    expect(detail.body.history[1].toStatus).toBe("in_progress");
    expect(detail.body.history[1].changedByName).toBe(worker.fullName);
    expect(detail.body.history[2].toStatus).toBe("done");
    expect(detail.body.history[2].changedByName).toBe(supervisor.fullName);
  });

  it("cambiar el avance de una tarea queda registrado en su historial", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Con avance" });

    const progressed = await request(app)
      .patch(`/api/tasks/${created.body.id}/progress`)
      .set(...authHeader(worker.token))
      .send({ progressPercentage: 40 });
    expect(progressed.status).toBe(200);
    expect(progressed.body.progressPercentage).toBe(40);

    const detail = await request(app)
      .get(`/api/tasks/${created.body.id}`)
      .set(...authHeader(worker.token));
    expect(detail.body.history).toHaveLength(2);
    expect(detail.body.history[0].kind).toBe("created");
    expect(detail.body.history[1]).toMatchObject({
      kind: "progress",
      fromProgressPercentage: 0,
      toProgressPercentage: 40,
      changedByName: worker.fullName,
    });
  });

  it("guardar el mismo avance que ya tenía no añade nada al historial", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Sin cambios" });

    await request(app)
      .patch(`/api/tasks/${created.body.id}/progress`)
      .set(...authHeader(worker.token))
      .send({ progressPercentage: 0 });

    const detail = await request(app)
      .get(`/api/tasks/${created.body.id}`)
      .set(...authHeader(worker.token));
    expect(detail.body.history).toHaveLength(1);
    expect(detail.body.history[0].kind).toBe("created");
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

  it("no se puede crear una tarea con fecha límite anterior a hoy", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project } = await setupProjectWithMember(admin.token);

    const res = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, title: "Con fecha pasada", dueDate: isoDateOffset(-1) });

    expect(res.status).toBe(400);
  });

  describe("estimación y registro de horas (issue #114)", () => {
    it("una tarea puede crearse con una estimación de horas", async () => {
      const admin = await createAdmin();
      const { supervisorToken, project } = await setupProjectWithMember(admin.token);

      const created = await request(app)
        .post("/api/tasks")
        .set(...authHeader(supervisorToken))
        .send({ projectId: project.id, title: "Con estimación", estimatedHours: 10 });

      expect(created.status).toBe(201);
      expect(created.body.estimatedHours).toBe(10);
      expect(created.body.loggedMinutes).toBe(0);
      expect(created.body.remainingHours).toBe(10);
    });

    it("sin estimación, remainingHours es null aunque se haya registrado tiempo", async () => {
      const admin = await createAdmin();
      const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
      const created = await request(app)
        .post("/api/tasks")
        .set(...authHeader(supervisorToken))
        .send({ projectId: project.id, assigneeId: worker.id, title: "Sin estimación" });

      const logged = await request(app)
        .post(`/api/tasks/${created.body.id}/time-entries`)
        .set(...authHeader(worker.token))
        .send({ amount: 2, unit: "hours", description: "Investigación inicial" });

      expect(logged.status).toBe(201);
      expect(logged.body.estimatedHours).toBeNull();
      expect(logged.body.loggedMinutes).toBe(120);
      expect(logged.body.remainingHours).toBeNull();
    });

    it("registra el tiempo en horas, minutos y días, todo convertido a minutos", async () => {
      const admin = await createAdmin();
      const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
      const created = await request(app)
        .post("/api/tasks")
        .set(...authHeader(supervisorToken))
        .send({ projectId: project.id, assigneeId: worker.id, title: "Con varias unidades", estimatedHours: 20 });

      await request(app)
        .post(`/api/tasks/${created.body.id}/time-entries`)
        .set(...authHeader(worker.token))
        .send({ amount: 1, unit: "hours", description: "Una hora" });
      await request(app)
        .post(`/api/tasks/${created.body.id}/time-entries`)
        .set(...authHeader(worker.token))
        .send({ amount: 30, unit: "minutes", description: "Media hora" });
      const afterDay = await request(app)
        .post(`/api/tasks/${created.body.id}/time-entries`)
        .set(...authHeader(worker.token))
        .send({ amount: 1, unit: "days", description: "Un día completo" });

      // 1h + 30min + 1 día (8h, ver WORKDAY_HOURS) = 9h30 = 570 min.
      expect(afterDay.body.loggedMinutes).toBe(570);
      expect(afterDay.body.remainingHours).toBeCloseTo(20 - 570 / 60, 5);

      const detail = await request(app)
        .get(`/api/tasks/${created.body.id}`)
        .set(...authHeader(worker.token));
      expect(detail.body.timeEntries).toHaveLength(3);
      expect(detail.body.timeEntries[0].description).toBe("Un día completo");
      expect(detail.body.timeEntries[0].loggedByName).toBe(worker.fullName);
    });

    it("rechaza una cantidad de tiempo no positiva o una descripción vacía", async () => {
      const admin = await createAdmin();
      const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
      const created = await request(app)
        .post("/api/tasks")
        .set(...authHeader(supervisorToken))
        .send({ projectId: project.id, assigneeId: worker.id, title: "Validaciones" });

      const zero = await request(app)
        .post(`/api/tasks/${created.body.id}/time-entries`)
        .set(...authHeader(worker.token))
        .send({ amount: 0, unit: "hours", description: "Nada" });
      expect(zero.status).toBe(400);

      const noDescription = await request(app)
        .post(`/api/tasks/${created.body.id}/time-entries`)
        .set(...authHeader(worker.token))
        .send({ amount: 1, unit: "hours", description: "" });
      expect(noDescription.status).toBe(400);
    });

    it("un trabajador no puede registrar tiempo en una tarea que no es suya", async () => {
      const admin = await createAdmin();
      const { supervisorToken, project, worker } = await setupProjectWithMember(admin.token);
      const outsider = await createWorker(admin.token);
      const created = await request(app)
        .post("/api/tasks")
        .set(...authHeader(supervisorToken))
        .send({ projectId: project.id, assigneeId: worker.id, title: "Ajena" });

      const res = await request(app)
        .post(`/api/tasks/${created.body.id}/time-entries`)
        .set(...authHeader(outsider.token))
        .send({ amount: 1, unit: "hours", description: "Intento" });

      expect(res.status).toBe(404);
    });

    it("un supervisor puede editar la estimación de horas de una tarea existente", async () => {
      const admin = await createAdmin();
      const { supervisorToken, project } = await setupProjectWithMember(admin.token);
      const created = await request(app)
        .post("/api/tasks")
        .set(...authHeader(supervisorToken))
        .send({ projectId: project.id, title: "A reestimar", estimatedHours: 5 });

      const updated = await request(app)
        .patch(`/api/tasks/${created.body.id}`)
        .set(...authHeader(supervisorToken))
        .send({ estimatedHours: 8 });

      expect(updated.status).toBe(200);
      expect(updated.body.estimatedHours).toBe(8);
    });
  });

  it("se puede crear una tarea con fecha límite de hoy o posterior", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project } = await setupProjectWithMember(admin.token);

    const today = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, title: "Para hoy", dueDate: isoDateOffset(0) });
    expect(today.status).toBe(201);

    const future = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, title: "Para mañana", dueDate: isoDateOffset(1) });
    expect(future.status).toBe(201);
  });

  it("no se puede editar una tarea poniéndole una fecha límite anterior a hoy", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, title: "Sin fecha" });

    const res = await request(app)
      .patch(`/api/tasks/${created.body.id}`)
      .set(...authHeader(supervisorToken))
      .send({ dueDate: isoDateOffset(-1) });

    expect(res.status).toBe(400);
  });

  it("editar otros campos sin tocar la fecha límite no la revalida", async () => {
    const admin = await createAdmin();
    const { supervisorToken, project } = await setupProjectWithMember(admin.token);
    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, title: "Original", dueDate: isoDateOffset(0) });

    const res = await request(app)
      .patch(`/api/tasks/${created.body.id}`)
      .set(...authHeader(supervisorToken))
      .send({ title: "Renombrada" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renombrada");
    expect(res.body.dueDate).toBe(isoDateOffset(0));
  });
});
