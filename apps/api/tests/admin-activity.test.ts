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

// pageSize grande a propósito en casi todos estos tests: la tabla de
// actividad es compartida por toda la suite (otros archivos de test
// también generan eventos a la vez), así que una página pequeña podría
// no llegar a incluir lo que se acaba de crear en este test en concreto.
// Comprobar presencia (some) u orden relativo entre dos eventos propios,
// en vez de la posición o el tamaño exactos de la lista, es lo que hace
// estos tests robustos frente a ese ruido.

describe("actividad del admin", () => {
  afterAll(closePool);

  it("sin filtro, trae eventos de cualquier tipo", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const projectName = `Proyecto sin filtro ${Date.now()}`;
    await createProjectViaAdmin(admin.token, supervisor.id, projectName);

    const res = await request(app)
      .get("/api/admin/activity")
      .query({ pageSize: 100 })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    const events = res.body.items as Array<{ type: string; projectName?: string }>;
    expect(events.some((e) => e.type === "user_created")).toBe(true);
    expect(events.some((e) => e.type === "project_created" && e.projectName === projectName)).toBe(
      true,
    );
  });

  it("ordena de más reciente a más antigua por defecto, y al revés con sortOrder=oldest", async () => {
    // No se busca un evento propio por nombre en una página concreta: con
    // toda la suite compartiendo la misma tabla de actividad, "el más
    // antiguo" de verdad puede ser de hace cientos de eventos, muy fuera
    // de una página de 100. En su lugar, se compara el extremo de cada
    // orden (el más reciente de "newest" frente al más antiguo de
    // "oldest") — solo hace falta que existan al menos dos
    // project_created con marcas de tiempo distintas, que estas dos
    // llamadas garantizan.
    const admin = await createAdmin();
    const supervisorA = await createUserViaAdmin(admin.token, "supervisor");
    await createProjectViaAdmin(admin.token, supervisorA.id);
    const supervisorB = await createUserViaAdmin(admin.token, "supervisor");
    await createProjectViaAdmin(admin.token, supervisorB.id);

    const newest = await request(app)
      .get("/api/admin/activity")
      .query({ types: "project_created", pageSize: 1 })
      .set(...authHeader(admin.token));
    const oldest = await request(app)
      .get("/api/admin/activity")
      .query({ types: "project_created", sortOrder: "oldest", pageSize: 1 })
      .set(...authHeader(admin.token));

    expect(newest.status).toBe(200);
    expect(oldest.status).toBe(200);
    const newestTime = new Date(newest.body.items[0].occurredAt).getTime();
    const oldestTime = new Date(oldest.body.items[0].occurredAt).getTime();
    expect(newestTime).toBeGreaterThan(oldestTime);
  });

  it("types con un solo tipo filtra a exactamente ese", async () => {
    const admin = await createAdmin();
    await createUserViaAdmin(admin.token, "supervisor");

    const res = await request(app)
      .get("/api/admin/activity")
      .query({ types: "user_created" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((e: { type: string }) => e.type === "user_created")).toBe(true);
  });

  it("types con varios tipos separados por coma trae una categoría entera", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const projectName = `Proyecto categoría ${Date.now()}`;
    const project = await createProjectViaAdmin(admin.token, supervisor.id, projectName);
    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ name: `${projectName} editado` });

    const res = await request(app)
      .get("/api/admin/activity")
      .query({ types: "project_created,project_updated", pageSize: 100 })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    const events = res.body.items as Array<{ type: string; projectName?: string }>;
    expect(events.some((e) => e.type === "project_created" && e.projectName === projectName)).toBe(
      true,
    );
    expect(
      events.some((e) => e.type === "project_updated" && e.projectName === `${projectName} editado`),
    ).toBe(true);
    expect(events.every((e) => e.type === "project_created" || e.type === "project_updated")).toBe(true);
  });

  it("rechaza un tipo que no existe en la lista de types", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get("/api/admin/activity")
      .query({ types: "not_a_real_type" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(400);
  });

  it("un trabajador no puede consultar la actividad del admin", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .get("/api/admin/activity")
      .set(...authHeader(worker.token));

    expect(res.status).toBe(403);
  });
});
