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
  return res.body.items as Array<{ id: string; type: string }>;
}

describe("preferencias de notificación", () => {
  afterAll(closePool);

  it("de entrada devuelve el valor por defecto de cada tipo, sin haberlas tocado nunca", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .get("/api/notification-preferences")
      .set(...authHeader(worker.token));

    expect(res.status).toBe(200);
    const byType = new Map(res.body.map((p: { type: string; channel: string }) => [p.type, p.channel]));
    // task_assigned y task_status_changed mandaban correo además de
    // guardarse en la plataforma antes de que existiera esta preferencia;
    // el resto solo se veían dentro de la app (ver DEFAULT_NOTIFICATION_CHANNEL).
    expect(byType.get("task_assigned")).toBe("both");
    expect(byType.get("task_status_changed")).toBe("both");
    expect(byType.get("project_member_added")).toBe("in_app");
    expect(byType.get("vacation_requested")).toBe("in_app");
  });

  it("cambia una preferencia y la conserva en la siguiente consulta", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const updated = await request(app)
      .patch("/api/notification-preferences/task_assigned")
      .set(...authHeader(worker.token))
      .send({ channel: "none" });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ type: "task_assigned", channel: "none" });

    const listed = await request(app)
      .get("/api/notification-preferences")
      .set(...authHeader(worker.token));
    const byType = new Map(listed.body.map((p: { type: string; channel: string }) => [p.type, p.channel]));
    expect(byType.get("task_assigned")).toBe("none");
    // No cambia ninguna otra preferencia al cambiar esta.
    expect(byType.get("task_status_changed")).toBe("both");
  });

  it("rechaza un tipo de notificación que no existe", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .patch("/api/notification-preferences/not_a_real_type")
      .set(...authHeader(worker.token))
      .send({ channel: "in_app" });
    expect(res.status).toBe(400);
  });

  it("rechaza un canal que no existe", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .patch("/api/notification-preferences/task_assigned")
      .set(...authHeader(worker.token))
      .send({ channel: "carrier_pigeon" });
    expect(res.status).toBe(400);
  });

  it("con la preferencia en 'none' no se guarda la notificación en la plataforma", async () => {
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
      .patch("/api/notification-preferences/task_assigned")
      .set(...authHeader(worker.token))
      .send({ channel: "none" });

    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "No debería notificar" });
    expect(created.status).toBe(201);

    const notifications = await myNotifications(worker.token);
    expect(notifications.some((n) => n.type === "task_assigned")).toBe(false);
  });

  it("con la preferencia en 'email' tampoco se guarda en la plataforma (solo por correo)", async () => {
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
      .patch("/api/notification-preferences/task_assigned")
      .set(...authHeader(worker.token))
      .send({ channel: "email" });

    const created = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, assigneeId: worker.id, title: "Solo por correo" });
    // El fallo del envío (sin SendGrid configurado en tests) es
    // best-effort: no debe tumbar la petición que originó la notificación.
    expect(created.status).toBe(201);

    const notifications = await myNotifications(worker.token);
    expect(notifications.some((n) => n.type === "task_assigned")).toBe(false);
  });
});
