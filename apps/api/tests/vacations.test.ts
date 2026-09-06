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

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// createWorker/createUserViaAdmin dan de alta con fecha de contratación
// 1 de enero del año en curso por defecto (ver defaultTestHireDate en
// helpers.ts): saldo de vacaciones completo (23 días), sin depender de
// en qué mes del año se ejecute la suite. Los tests de "saldo de
// vacaciones" más abajo pasan su propia hireDate cuando quieren probar
// justo el límite o la proporción.
async function setupTeam(adminToken: string) {
  const supervisor = await createUserViaAdmin(adminToken, "supervisor");
  const supervisorToken = (
    await request(app).post("/api/auth/login").send({ email: supervisor.email, password: supervisor.password })
  ).body.token as string;
  const project = await createProjectViaAdmin(adminToken, supervisor.id);
  const worker = await createWorker(adminToken);
  await request(app)
    .post(`/api/admin/projects/${project.id}/members`)
    .set(...authHeader(adminToken))
    .send({ userId: worker.id });
  return { supervisor, supervisorToken, project, worker };
}

describe("solicitudes de vacaciones", () => {
  it("un trabajador solicita vacaciones", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.userId).toBe(worker.id);
  });

  it("rechaza una solicitud con fecha de inicio en el pasado", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(-1), endDate: isoDateOffset(5) });

    expect(res.status).toBe(400);
  });

  it("rechaza una solicitud con fecha de fin anterior a la de inicio", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(10), endDate: isoDateOffset(5) });

    expect(res.status).toBe(400);
  });

  it("un supervisor no puede solicitar vacaciones, ni un admin", async () => {
    const admin = await createAdmin();
    const { supervisorToken } = await setupTeam(admin.token);

    const bySupervisor = await request(app)
      .post("/api/vacations")
      .set(...authHeader(supervisorToken))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });
    expect(bySupervisor.status).toBe(403);

    const byAdmin = await request(app)
      .post("/api/vacations")
      .set(...authHeader(admin.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });
    expect(byAdmin.status).toBe(403);
  });

  it("un trabajador cancela su propia solicitud pendiente", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const created = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });

    const res = await request(app)
      .post(`/api/vacations/${created.body.id}/cancel`)
      .set(...authHeader(worker.token));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("un trabajador no puede cancelar la solicitud de otro", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const outsider = await createWorker(admin.token);
    const created = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });

    const res = await request(app)
      .post(`/api/vacations/${created.body.id}/cancel`)
      .set(...authHeader(outsider.token));

    expect(res.status).toBe(404);
  });

  it("el supervisor ve, y aprueba, las solicitudes de su equipo", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);
    const created = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });

    const list = await request(app).get("/api/vacations/team").set(...authHeader(supervisorToken));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].userFullName).toBe(worker.fullName);

    const approved = await request(app)
      .post(`/api/vacations/${created.body.id}/approve`)
      .set(...authHeader(supervisorToken));
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe("approved");
  });

  it("el supervisor no puede decidir sobre una solicitud fuera de su equipo", async () => {
    const admin = await createAdmin();
    const outsider = await createWorker(admin.token);
    const outsiderRequest = await request(app)
      .post("/api/vacations")
      .set(...authHeader(outsider.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });
    const { supervisorToken } = await setupTeam(admin.token);

    const res = await request(app)
      .post(`/api/vacations/${outsiderRequest.body.id}/approve`)
      .set(...authHeader(supervisorToken));

    expect(res.status).toBe(404);
  });

  // Nota: antes de la #104, volver a decidir una solicitud ya decidida
  // devolvía 409 siempre. Ahora solo lo hace si ya ha empezado la fecha
  // de inicio (ver "no se puede cambiar la decisión una vez han
  // empezado las vacaciones", más abajo) — mientras no haya llegado, el
  // supervisor puede cambiar de opinión.

  it("una vacación aprobada y en curso marca 'on_vacation' en el dashboard del supervisor", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);
    const created = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(0), endDate: isoDateOffset(3) });
    await request(app)
      .post(`/api/vacations/${created.body.id}/approve`)
      .set(...authHeader(supervisorToken));

    const dashboard = await request(app)
      .get("/api/dashboard/supervisor")
      .set(...authHeader(supervisorToken));

    const teamEntry = dashboard.body.team.find((t: { id: string }) => t.id === worker.id);
    expect(teamEntry.status).toBe("on_vacation");
  });

  it("solicitar vacaciones notifica al supervisor", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });

    const notifications = await request(app)
      .get("/api/notifications")
      .set(...authHeader(supervisorToken));
    expect(
      notifications.body.items.some((n: { type: string }) => n.type === "vacation_requested"),
    ).toBe(true);
  });

  it("el supervisor puede cambiar de opinión sobre una decisión antes de que empiecen las vacaciones", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);
    const created = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });
    await request(app)
      .post(`/api/vacations/${created.body.id}/approve`)
      .set(...authHeader(supervisorToken));

    const changed = await request(app)
      .post(`/api/vacations/${created.body.id}/reject`)
      .set(...authHeader(supervisorToken));

    expect(changed.status).toBe(200);
    expect(changed.body.status).toBe("rejected");
  });

  it("no se puede cambiar la decisión una vez han empezado las vacaciones", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);
    const created = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(0), endDate: isoDateOffset(3) });
    await request(app)
      .post(`/api/vacations/${created.body.id}/approve`)
      .set(...authHeader(supervisorToken));

    const res = await request(app)
      .post(`/api/vacations/${created.body.id}/reject`)
      .set(...authHeader(supervisorToken));

    expect(res.status).toBe(409);
  });

  it("no se puede decidir sobre una solicitud ya cancelada", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);
    const created = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(5), endDate: isoDateOffset(10) });
    await request(app)
      .post(`/api/vacations/${created.body.id}/cancel`)
      .set(...authHeader(worker.token));

    const res = await request(app)
      .post(`/api/vacations/${created.body.id}/approve`)
      .set(...authHeader(supervisorToken));

    expect(res.status).toBe(409);
  });
});

describe("saldo de vacaciones", () => {
  afterAll(closePool);

  it("quien empezó el 1 de enero tiene 23 días de saldo, ni uno más", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token); // hireDate por defecto: 1 de enero

    const withinBalance = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(10), endDate: isoDateOffset(29) }); // 20 días
    expect(withinBalance.status).toBe(201);

    const stillFits = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(40), endDate: isoDateOffset(42) }); // 3 días más: 23 justos
    expect(stillFits.status).toBe(201);

    const overBudget = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(50), endDate: isoDateOffset(50) }); // 1 día más se pasa
    expect(overBudget.status).toBe(409);
  });

  it("quien empezó a mitad de año tiene un saldo proporcional, no los 23 completos", async () => {
    const admin = await createAdmin();
    const year = new Date().getUTCFullYear();
    // Empezó el 1 de julio: round(23 * (13-7) / 12) = 12 días de saldo.
    const worker = await createWorker(admin.token, `${year}-07-01`);

    const withinBalance = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(10), endDate: isoDateOffset(19) }); // 10 días
    expect(withinBalance.status).toBe(201);

    const overBudget = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(30), endDate: isoDateOffset(32) }); // 3 más: 13 > 12
    expect(overBudget.status).toBe(409);

    const stillFits = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(30), endDate: isoDateOffset(31) }); // 2 más: 12 justos
    expect(stillFits.status).toBe(201);
  });

  it("una solicitud rechazada no cuenta para el saldo consumido", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    const first = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(10), endDate: isoDateOffset(29) }); // 20 días
    expect(first.status).toBe(201);
    await request(app)
      .post(`/api/vacations/${first.body.id}/reject`)
      .set(...authHeader(supervisorToken));

    // Si la rechazada siguiera contando, esto (20 días más) se pasaría
    // del saldo de 23; al no contar, cabe de sobra.
    const second = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(40), endDate: isoDateOffset(59) });
    expect(second.status).toBe(201);
  });

  it("el mensaje de error indica cuántos días quedan", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token); // hireDate por defecto: 1 de enero
    await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(10), endDate: isoDateOffset(29) }); // 20 días, quedan 3

    const res = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDateOffset(40), endDate: isoDateOffset(43) }); // pide 4, solo quedan 3

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("quedan 3");
  });
});
