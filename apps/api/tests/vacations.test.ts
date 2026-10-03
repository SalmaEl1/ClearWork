import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
import { nationalHolidaysForYear } from "../src/modules/holidays/nationalHolidays.js";

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** El próximo día (a partir de mañana, nunca hoy) cuyo día de la semana
 * en UTC sea `dow` (0 = domingo ... 6 = sábado) — para construir fechas
 * de fin de semana o de un día laborable concreto sin depender de qué
 * día de la semana sea "hoy" al ejecutar la suite. */
function nextDow(dow: number): Date {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function isNationalHoliday(date: string): boolean {
  const year = Number(date.slice(0, 4));
  return nationalHolidaysForYear(year).some((h) => h.date === date);
}

/** El primer día a partir de `date` (incluido) que no sea festivo
 * nacional: assertWithinVacationBalance (vacations/service.ts) rechaza
 * con 400 cualquier solicitud que EMPIECE (o termine) justo en festivo,
 * aparte de que ese día tampoco cuente para el total — dos reglas
 * distintas, y esta cubre la primera. */
function firstNonHoliday(date: string): string {
  const d = new Date(date);
  while (isNationalHoliday(isoDate(d))) d.setDate(d.getDate() + 1);
  return isoDate(d);
}

/** Construye un rango [startDate, endDate] que cuenta exactamente
 * `neededDays` días de vacaciones (mismo criterio que
 * countVacationDays, balance.ts) a partir de `rawStartDate`: si ese día
 * es festivo, arranca en el siguiente que no lo sea (ver
 * firstNonHoliday); desde ahí avanza día a día, saltándose también los
 * festivos que puedan caer en medio (p. ej. el 12 de octubre) en vez de
 * darlos por buenos. Sin esto, estos tests de saldo (que necesitan una
 * cuenta exacta de días, y que la propia fecha de inicio no sea
 * festiva) dependerían de en qué época del año se ejecute la suite —
 * justo lo que ya evita nextDow más abajo para los tests de fin de
 * semana. excludeWeekends está desactivado para todo este describe, así
 * que aquí solo hace falta esquivar festivos, no fines de semana. */
function vacationRangeFrom(rawStartDate: string, neededDays: number): { startDate: string; endDate: string } {
  const startDate = firstNonHoliday(rawStartDate);
  const cursor = new Date(startDate);
  let counted = 0;
  while (counted < neededDays) {
    if (!isNationalHoliday(isoDate(cursor))) counted++;
    if (counted < neededDays) cursor.setDate(cursor.getDate() + 1);
  }
  return { startDate, endDate: isoDate(cursor) };
}

function vacationRange(startOffset: number, neededDays: number): { startDate: string; endDate: string } {
  return vacationRangeFrom(isoDateOffset(startOffset), neededDays);
}

/** El siguiente rango tras uno ya construido, dejando un hueco de unos
 * días para no pegarlo justo detrás — dos solicitudes vecinas en vez de
 * saltar a un offset grande y arriesgarse a cruzar a un año distinto
 * (con su propio saldo nuevo, ver vacationDaysForYear en balance.ts). */
function vacationRangeAfter(
  previous: { endDate: string },
  gapDays: number,
  neededDays: number,
): { startDate: string; endDate: string } {
  const start = new Date(previous.endDate);
  start.setDate(start.getDate() + gapDays);
  return vacationRangeFrom(isoDate(start), neededDays);
}

/** El resto de tests de este archivo no van sobre fines de semana: para
 * que sus rangos con isoDateOffset (que no evitan sábados/domingos)
 * sean deterministas, se desactiva este ajuste al entrar y se restaura
 * el valor original al salir — mismo criterio que settings.test.ts con
 * defaultWeeklyTargetHours. */
async function setExcludeWeekends(adminToken: string, value: boolean): Promise<void> {
  const current = await request(app).get("/api/admin/settings").set(...authHeader(adminToken));
  await request(app)
    .patch("/api/admin/settings")
    .set(...authHeader(adminToken))
    .send({
      defaultWeeklyTargetHours: current.body.defaultWeeklyTargetHours,
      excludeWeekendsFromVacationDays: value,
    });
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
  let originalExcludeWeekends: boolean;

  beforeAll(async () => {
    const admin = await createAdmin();
    const current = await request(app).get("/api/admin/settings").set(...authHeader(admin.token));
    originalExcludeWeekends = current.body.excludeWeekendsFromVacationDays;
    await setExcludeWeekends(admin.token, false);
  });

  afterAll(async () => {
    const admin = await createAdmin();
    await setExcludeWeekends(admin.token, originalExcludeWeekends);
  });

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
  let originalExcludeWeekends: boolean;

  beforeAll(async () => {
    const admin = await createAdmin();
    const current = await request(app).get("/api/admin/settings").set(...authHeader(admin.token));
    originalExcludeWeekends = current.body.excludeWeekendsFromVacationDays;
    await setExcludeWeekends(admin.token, false);
  });

  afterAll(async () => {
    const admin = await createAdmin();
    await setExcludeWeekends(admin.token, originalExcludeWeekends);
    await closePool();
  });

  it("quien empezó el 1 de enero tiene 23 días de saldo, ni uno más", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token); // hireDate por defecto: 1 de enero

    const first = vacationRange(10, 20); // 20 días
    const withinBalance = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(first);
    expect(withinBalance.status).toBe(201);

    const second = vacationRangeAfter(first, 5, 3); // 3 días más: 23 justos
    const stillFits = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(second);
    expect(stillFits.status).toBe(201);

    const third = vacationRangeAfter(second, 5, 1); // 1 día más se pasa
    const overBudget = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(third);
    expect(overBudget.status).toBe(409);
  });

  it("quien empezó a mitad de año tiene un saldo proporcional, no los 23 completos", async () => {
    const admin = await createAdmin();
    const year = new Date().getUTCFullYear();
    // Empezó el 1 de julio: round(23 * (13-7) / 12) = 12 días de saldo.
    const worker = await createWorker(admin.token, `${year}-07-01`);

    const first = vacationRange(10, 10); // 10 días
    const withinBalance = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(first);
    expect(withinBalance.status).toBe(201);

    const second = vacationRangeAfter(first, 5, 3); // 3 más: 13 > 12
    const overBudget = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(second);
    expect(overBudget.status).toBe(409);

    const third = vacationRangeFrom(second.startDate, 2); // 2 más: 12 justos (la anterior fue rechazada, no consume saldo)
    const stillFits = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(third);
    expect(stillFits.status).toBe(201);
  });

  it("una solicitud rechazada no cuenta para el saldo consumido", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    const firstRange = vacationRange(10, 20); // 20 días
    const first = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(firstRange);
    expect(first.status).toBe(201);
    await request(app)
      .post(`/api/vacations/${first.body.id}/reject`)
      .set(...authHeader(supervisorToken));

    // Si la rechazada siguiera contando, esto (20 días más) se pasaría
    // del saldo de 23; al no contar, cabe de sobra.
    const second = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(vacationRangeAfter(firstRange, 10, 20));
    expect(second.status).toBe(201);
  });

  it("el mensaje de error indica cuántos días quedan", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token); // hireDate por defecto: 1 de enero
    const first = vacationRange(10, 20); // 20 días, quedan 3
    await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(first);

    const res = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send(vacationRangeAfter(first, 5, 4)); // pide 4, solo quedan 3

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("quedan 3");
  });

  it("un fin de semana dentro del rango no cuenta para el saldo si el ajuste está activo", async () => {
    const admin = await createAdmin();
    await setExcludeWeekends(admin.token, true);
    const worker = await createWorker(admin.token); // hireDate por defecto: 1 de enero

    // Un viernes y su lunes que no sean festivos (p. ej. el lunes 12 de
    // octubre): empezar o terminar en festivo es otro 400 distinto.
    const friday = nextDow(5);
    const monday = new Date(friday);
    monday.setUTCDate(friday.getUTCDate() + 3);
    while (isNationalHoliday(isoDate(friday)) || isNationalHoliday(isoDate(monday))) {
      friday.setUTCDate(friday.getUTCDate() + 7);
      monday.setUTCDate(monday.getUTCDate() + 7);
    }

    // Viernes a lunes: 4 días naturales, pero sábado y domingo no
    // cuentan, así que solo se consumen 2.
    const res = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDate(friday), endDate: isoDate(monday) });
    expect(res.status).toBe(201);

    const balance = await request(app).get("/api/vacations/balance").set(...authHeader(worker.token));
    expect(balance.body.used).toBe(2);
  });

  it("no se puede empezar ni terminar una solicitud en fin de semana si el ajuste está activo", async () => {
    const admin = await createAdmin();
    await setExcludeWeekends(admin.token, true);
    const worker = await createWorker(admin.token);

    const saturday = nextDow(6);
    const sunday = new Date(saturday);
    sunday.setUTCDate(saturday.getUTCDate() + 1);

    const res = await request(app)
      .post("/api/vacations")
      .set(...authHeader(worker.token))
      .send({ startDate: isoDate(saturday), endDate: isoDate(sunday) });

    expect(res.status).toBe(400);
  });
});
