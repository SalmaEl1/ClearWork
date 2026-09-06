import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authHeader, closePool, createAdmin, createWorker } from "./helpers.js";

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Cada test usa su propio día (offset distinto): las reservas quedan en
// una tabla real que no se vacía entre tests de este mismo archivo, así
// que reutilizar la misma fecha en más de un test chocaría con la
// restricción UNIQUE (date, seat_number) de un test a otro.

describe("reserva de sitio en la oficina", () => {
  afterAll(closePool);

  it("cualquier rol autenticado puede consultar la disponibilidad de un día", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const date = isoDateOffset(10);

    const res = await request(app)
      .get("/api/seats")
      .query({ date })
      .set(...authHeader(worker.token));

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(date);
    expect(typeof res.body.totalSeats).toBe("number");
    expect(res.body.reservations).toEqual([]);
  });

  it("un trabajador reserva un asiento libre, y aparece en la disponibilidad", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const date = isoDateOffset(11);

    const created = await request(app)
      .post("/api/seats")
      .set(...authHeader(worker.token))
      .send({ date, seatNumber: 3 });

    expect(created.status).toBe(201);
    expect(created.body.seatNumber).toBe(3);
    expect(created.body.userFullName).toBe(worker.fullName);

    const availability = await request(app)
      .get("/api/seats")
      .query({ date })
      .set(...authHeader(admin.token));
    expect(
      availability.body.reservations.some((r: { seatNumber: number }) => r.seatNumber === 3),
    ).toBe(true);
  });

  it("no se puede reservar un asiento ya ocupado ese día", async () => {
    const admin = await createAdmin();
    const workerA = await createWorker(admin.token);
    const workerB = await createWorker(admin.token);
    const date = isoDateOffset(12);

    const first = await request(app)
      .post("/api/seats")
      .set(...authHeader(workerA.token))
      .send({ date, seatNumber: 1 });
    expect(first.status).toBe(201);

    const res = await request(app)
      .post("/api/seats")
      .set(...authHeader(workerB.token))
      .send({ date, seatNumber: 1 });

    expect(res.status).toBe(409);
  });

  it("no se puede tener dos asientos reservados el mismo día", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const date = isoDateOffset(13);

    const first = await request(app)
      .post("/api/seats")
      .set(...authHeader(worker.token))
      .send({ date, seatNumber: 1 });
    expect(first.status).toBe(201);

    const res = await request(app)
      .post("/api/seats")
      .set(...authHeader(worker.token))
      .send({ date, seatNumber: 2 });

    expect(res.status).toBe(409);
  });

  it("rechaza un número de asiento fuera de rango", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/seats")
      .set(...authHeader(worker.token))
      .send({ date: isoDateOffset(14), seatNumber: 99999 });

    expect(res.status).toBe(400);
  });

  it("rechaza reservar un día que ya ha pasado", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/seats")
      .set(...authHeader(worker.token))
      .send({ date: isoDateOffset(-1), seatNumber: 1 });

    expect(res.status).toBe(400);
  });

  it("un trabajador cancela su propia reserva", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const date = isoDateOffset(15);

    const created = await request(app)
      .post("/api/seats")
      .set(...authHeader(worker.token))
      .send({ date, seatNumber: 1 });
    expect(created.status).toBe(201);

    const res = await request(app)
      .delete(`/api/seats/${created.body.id}`)
      .set(...authHeader(worker.token));
    expect(res.status).toBe(204);

    const availability = await request(app)
      .get("/api/seats")
      .query({ date })
      .set(...authHeader(worker.token));
    expect(availability.body.reservations).toHaveLength(0);
  });

  it("un trabajador no puede cancelar la reserva de otro", async () => {
    const admin = await createAdmin();
    const workerA = await createWorker(admin.token);
    const workerB = await createWorker(admin.token);
    const date = isoDateOffset(16);

    const created = await request(app)
      .post("/api/seats")
      .set(...authHeader(workerA.token))
      .send({ date, seatNumber: 1 });
    expect(created.status).toBe(201);

    const res = await request(app)
      .delete(`/api/seats/${created.body.id}`)
      .set(...authHeader(workerB.token));

    expect(res.status).toBe(404);
  });

  it("un admin o supervisor no pueden reservar asiento", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post("/api/seats")
      .set(...authHeader(admin.token))
      .send({ date: isoDateOffset(17), seatNumber: 1 });

    expect(res.status).toBe(403);
  });

  it("el admin puede cambiar cuántos asientos hay en total", async () => {
    const admin = await createAdmin();
    const before = await request(app).get("/api/admin/settings").set(...authHeader(admin.token));

    const updated = await request(app)
      .patch("/api/admin/settings")
      .set(...authHeader(admin.token))
      .send({ defaultWeeklyTargetHours: before.body.defaultWeeklyTargetHours, officeSeatCount: 5 });
    expect(updated.status).toBe(200);
    expect(updated.body.officeSeatCount).toBe(5);

    const worker = await createWorker(admin.token);
    const res = await request(app)
      .post("/api/seats")
      .set(...authHeader(worker.token))
      .send({ date: isoDateOffset(18), seatNumber: 6 });
    expect(res.status).toBe(400);

    // Se deja como estaba, para no afectar al resto de tests.
    await request(app)
      .patch("/api/admin/settings")
      .set(...authHeader(admin.token))
      .send({
        defaultWeeklyTargetHours: before.body.defaultWeeklyTargetHours,
        officeSeatCount: before.body.officeSeatCount,
      });
  });
});
