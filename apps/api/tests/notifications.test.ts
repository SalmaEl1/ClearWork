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

async function myNotifications(token: string) {
  const res = await request(app).get("/api/notifications").set(...authHeader(token));
  return res.body.items as Array<{ id: string; type: string; readAt: string | null }>;
}

describe("notificaciones", () => {
  afterAll(closePool);

  it("asignar una tarea notifica al trabajador asignado", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Tarea notificada" });

    const notifications = await myNotifications(worker.token);
    const assigned = notifications.find((n) => n.type === "task_assigned");
    expect(assigned).toBeDefined();
    expect(assigned?.readAt).toBeNull();
  });

  it("reasignar una tarea notifica al nuevo asignado y de baja al anterior", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const workerA = await createWorker(admin.token);
    const workerB = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: workerA.id });
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: workerB.id });

    const task = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: workerA.id, title: "Reasignada" });

    await request(app)
      .patch(`/api/tasks/${task.body.id}`)
      .set(...authHeader(supervisorToken))
      .send({ assigneeId: workerB.id });

    const notificationsA = await myNotifications(workerA.token);
    expect(notificationsA.some((n) => n.type === "task_unassigned")).toBe(true);

    const notificationsB = await myNotifications(workerB.token);
    expect(notificationsB.some((n) => n.type === "task_assigned")).toBe(true);
  });

  it("cambiar el estado de una tarea notifica a la otra parte", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    const task = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Con cambio de estado" });

    await request(app)
      .patch(`/api/tasks/${task.body.id}/status`)
      .set(...authHeader(worker.token))
      .send({ status: "in_progress" });

    const supervisorNotifications = await myNotifications(supervisorToken);
    expect(supervisorNotifications.some((n) => n.type === "task_status_changed")).toBe(true);
  });

  it("asignar y quitar del proyecto notifica al trabajador", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);

    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    const afterAssign = await myNotifications(worker.token);
    expect(afterAssign.some((n) => n.type === "project_member_added")).toBe(true);

    await request(app)
      .delete(`/api/admin/projects/${project.id}/members/${worker.id}`)
      .set(...authHeader(admin.token));
    const afterRemove = await myNotifications(worker.token);
    expect(afterRemove.some((n) => n.type === "project_member_removed")).toBe(true);
  });

  it("reasignar el supervisor de un proyecto notifica al supervisor saliente", async () => {
    const admin = await createAdmin();
    const oldSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const oldSupervisorToken = await loginAs(oldSupervisor.email, oldSupervisor.password);
    const newSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, oldSupervisor.id);

    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ supervisorId: newSupervisor.id });

    const notifications = await myNotifications(oldSupervisorToken);
    expect(notifications.some((n) => n.type === "project_supervisor_removed")).toBe(true);
  });

  it("el contador de no leídas baja al marcar una notificación como leída, y a cero al marcar todas", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Tarea A" });
    await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Tarea B" });

    // 3, no 2: además de las dos asignaciones de tarea, incorporarse al
    // proyecto (paso previo necesario para poder asignarle una tarea) ya
    // genera su propia notificación de "project_member_added".
    const before = await request(app)
      .get("/api/notifications/unread-count")
      .set(...authHeader(worker.token));
    expect(before.body.count).toBe(3);

    const notifications = await myNotifications(worker.token);
    const first = notifications[0]!;
    const markOne = await request(app)
      .patch(`/api/notifications/${first.id}/read`)
      .set(...authHeader(worker.token));
    expect(markOne.status).toBe(200);
    expect(markOne.body.readAt).not.toBeNull();

    const afterOne = await request(app)
      .get("/api/notifications/unread-count")
      .set(...authHeader(worker.token));
    expect(afterOne.body.count).toBe(2);

    const markAll = await request(app)
      .post("/api/notifications/read-all")
      .set(...authHeader(worker.token));
    expect(markAll.status).toBe(204);

    const afterAll_ = await request(app)
      .get("/api/notifications/unread-count")
      .set(...authHeader(worker.token));
    expect(afterAll_.body.count).toBe(0);
  });

  it("no se puede marcar como leída una notificación ajena", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    const intruder = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Ajena" });

    const notifications = await myNotifications(worker.token);
    const target = notifications[0]!;

    const res = await request(app)
      .patch(`/api/notifications/${target.id}/read`)
      .set(...authHeader(intruder.token));
    expect(res.status).toBe(404);
  });
});
