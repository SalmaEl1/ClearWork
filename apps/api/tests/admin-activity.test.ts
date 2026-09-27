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

// pageSize grande a propósito en casi todos estos tests: la tabla de
// actividad es compartida por toda la suite (otros archivos de test
// también generan eventos a la vez), así que una página pequeña podría
// no llegar a incluir lo que se acaba de crear en este test en concreto.
// Comprobar presencia (some) u orden relativo entre dos eventos propios,
// en vez de la posición o el tamaño exactos de la lista, es lo que hace
// estos tests robustos frente a ese ruido.

describe("actividad del admin", () => {
  // El pool se cierra una sola vez para todo el archivo, en el afterAll
  // del último describe (más abajo) — dos afterAll(closePool) en el
  // mismo archivo cerrarían el pool compartido a mitad de la suite.
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

  it("exporta a CSV con cabecera y una fila por evento, respetando el filtro de tipo", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const projectName = `Proyecto CSV ${Date.now()}`;
    await createProjectViaAdmin(admin.token, supervisor.id, projectName);

    const res = await request(app)
      .get("/api/admin/activity/export")
      .query({ types: "project_created" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Fecha,Tipo,Descripción");
    expect(res.text).toContain(`Se creó el proyecto ${projectName}`);
  });

  it("rechaza un tipo que no existe también al exportar a CSV", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get("/api/admin/activity/export")
      .query({ types: "not_a_real_type" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(400);
  });
});

describe("actividad del equipo (supervisor)", () => {
  afterAll(closePool);

  it("solo trae eventos de los proyectos del propio supervisor", async () => {
    const admin = await createAdmin();
    const supervisorA = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorAToken = await loginAs(supervisorA.email, supervisorA.password);
    const projectAName = `Proyecto A ${Date.now()}`;
    await createProjectViaAdmin(admin.token, supervisorA.id, projectAName);

    const supervisorB = await createUserViaAdmin(admin.token, "supervisor");
    const projectBName = `Proyecto B ${Date.now()}`;
    await createProjectViaAdmin(admin.token, supervisorB.id, projectBName);

    const res = await request(app)
      .get("/api/supervisor/activity")
      .query({ types: "project_created", pageSize: 100 })
      .set(...authHeader(supervisorAToken));

    expect(res.status).toBe(200);
    const events = res.body.items as Array<{ projectName?: string }>;
    expect(events.some((e) => e.projectName === projectAName)).toBe(true);
    expect(events.some((e) => e.projectName === projectBName)).toBe(false);
  });

  it("no puede ver el feed del equipo un trabajador ni un admin", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const workerRes = await request(app)
      .get("/api/supervisor/activity")
      .set(...authHeader(worker.token));
    expect(workerRes.status).toBe(403);

    const adminRes = await request(app)
      .get("/api/supervisor/activity")
      .set(...authHeader(admin.token));
    expect(adminRes.status).toBe(403);
  });

  it("exporta a CSV solo los eventos del propio equipo", async () => {
    const admin = await createAdmin();
    const supervisorA = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorAToken = await loginAs(supervisorA.email, supervisorA.password);
    const projectAName = `Proyecto export A ${Date.now()}`;
    await createProjectViaAdmin(admin.token, supervisorA.id, projectAName);

    const supervisorB = await createUserViaAdmin(admin.token, "supervisor");
    const projectBName = `Proyecto export B ${Date.now()}`;
    await createProjectViaAdmin(admin.token, supervisorB.id, projectBName);

    const res = await request(app)
      .get("/api/supervisor/activity/export")
      .query({ types: "project_created" })
      .set(...authHeader(supervisorAToken));

    expect(res.status).toBe(200);
    expect(res.text).toContain(projectAName);
    expect(res.text).not.toContain(projectBName);
  });

  it("rechaza un tipo que no existe al listar la actividad del equipo", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);

    const res = await request(app)
      .get("/api/supervisor/activity")
      .query({ types: "not_a_real_type" })
      .set(...authHeader(supervisorToken));

    expect(res.status).toBe(400);
  });

  it("rechaza un tipo que no existe al exportar la actividad del equipo", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);

    const res = await request(app)
      .get("/api/supervisor/activity/export")
      .query({ types: "not_a_real_type" })
      .set(...authHeader(supervisorToken));

    expect(res.status).toBe(400);
  });
});
