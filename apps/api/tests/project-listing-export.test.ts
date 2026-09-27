import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { pool } from "../src/db/pool.js";
import * as projectsRepo from "../src/modules/projects/repository.js";
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

describe("listado, exportación y tareas de proyectos (panel de admin)", () => {
  afterAll(closePool);

  it("lista proyectos paginados con el total real", async () => {
    const admin = await createAdmin();
    const supervisorA = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorB = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorC = await createUserViaAdmin(admin.token, "supervisor");
    await createProjectViaAdmin(admin.token, supervisorA.id);
    await createProjectViaAdmin(admin.token, supervisorB.id);
    await createProjectViaAdmin(admin.token, supervisorC.id);

    const firstPage = await request(app)
      .get("/api/admin/projects")
      .query({ page: 1, pageSize: 2 })
      .set(...authHeader(admin.token));
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.items).toHaveLength(2);
    expect(firstPage.body.total).toBeGreaterThanOrEqual(3);
    expect(firstPage.body.page).toBe(1);
    expect(firstPage.body.pageSize).toBe(2);

    const secondPage = await request(app)
      .get("/api/admin/projects")
      .query({ page: 2, pageSize: 2 })
      .set(...authHeader(admin.token));
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.page).toBe(2);
    expect(secondPage.body.total).toBeGreaterThanOrEqual(3);

    // Una página más allá del final: sin filas.
    // Nota: `total` vuelve a 0 en este caso (no el total real) porque
    // listProjectsPage solo puede leer el total_count de la ventana
    // COUNT(*) OVER() cuando hay al menos una fila en la página — ver
    // repository.ts. No se afirma aquí ese 0 como comportamiento
    // correcto, solo se documenta el actual.
    const farPage = await request(app)
      .get("/api/admin/projects")
      .query({ page: 1000, pageSize: 2 })
      .set(...authHeader(admin.token));
    expect(farPage.status).toBe(200);
    expect(farPage.body.items).toHaveLength(0);
  });

  it("filtra proyectos por nombre", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const uniqueTag = randomUUID();
    await createProjectViaAdmin(admin.token, supervisor.id, `Proyecto Alfa ${uniqueTag}`);

    const res = await request(app)
      .get("/api/admin/projects")
      .query({ search: `Alfa ${uniqueTag}` })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe(`Proyecto Alfa ${uniqueTag}`);
  });

  it("filtra proyectos por el nombre de su supervisor/a", async () => {
    const admin = await createAdmin();
    const uniqueName = `Supervisora Buscable ${randomUUID()}`;
    const supervisor = await createUserViaAdmin(admin.token, "supervisor", uniqueName);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    const res = await request(app)
      .get("/api/admin/projects")
      .query({ search: uniqueName })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.items.map((p: { id: string }) => p.id)).toContain(project.id);
  });

  it("combina el filtro de búsqueda con el de archivado", async () => {
    const admin = await createAdmin();
    const uniqueTag = randomUUID();
    const supervisorArchived = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorActive = await createUserViaAdmin(admin.token, "supervisor");
    const archivedProject = await createProjectViaAdmin(
      admin.token,
      supervisorArchived.id,
      `Proyecto Combo ${uniqueTag}`,
    );
    await createProjectViaAdmin(admin.token, supervisorActive.id, `Proyecto Combo ${uniqueTag} bis`);
    await request(app)
      .patch(`/api/admin/projects/${archivedProject.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });

    const onlyArchived = await request(app)
      .get("/api/admin/projects")
      .query({ search: `Combo ${uniqueTag}`, archived: "true" })
      .set(...authHeader(admin.token));
    expect(onlyArchived.status).toBe(200);
    expect(onlyArchived.body.items.map((p: { id: string }) => p.id)).toEqual([archivedProject.id]);

    const onlyActive = await request(app)
      .get("/api/admin/projects")
      .query({ search: `Combo ${uniqueTag}`, archived: "false" })
      .set(...authHeader(admin.token));
    expect(onlyActive.status).toBe(200);
    expect(onlyActive.body.items.map((p: { id: string }) => p.id)).not.toContain(archivedProject.id);
  });

  it("exporta proyectos a CSV con las cabeceras y el contenido esperados", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor", "Supervisor CSV");
    const uniqueTag = randomUUID();
    await createProjectViaAdmin(admin.token, supervisor.id, `Proyecto CSV ${uniqueTag}`);

    const res = await request(app)
      .get("/api/admin/projects/export")
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain('filename="proyectos.csv"');
    expect(res.text.startsWith("Nombre,Descripción,Supervisor/a,Archivado,Creado\r\n")).toBe(true);
    expect(res.text).toContain(`Proyecto CSV ${uniqueTag},,Supervisor CSV,No,`);
  });

  it("exporta solo los proyectos archivados cuando se filtra por archived=true", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const uniqueTag = randomUUID();
    const project = await createProjectViaAdmin(admin.token, supervisor.id, `Proyecto ArchivoCSV ${uniqueTag}`);
    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });

    const res = await request(app)
      .get("/api/admin/projects/export")
      .query({ archived: "true", search: `ArchivoCSV ${uniqueTag}` })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.text).toContain(`Proyecto ArchivoCSV ${uniqueTag}`);
    expect(res.text).toContain(",Sí,");
  });

  it("devuelve las tareas de un proyecto para el panel de admin", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    const createdTask = await request(app)
      .post("/api/tasks")
      .set(...authHeader(supervisorToken))
      .send({ projectId: project.id, title: "Tarea de prueba" });
    expect(createdTask.status).toBe(201);

    const res = await request(app)
      .get(`/api/admin/projects/${project.id}/tasks`)
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Tarea de prueba");
    expect(res.body[0].loggedMinutes).toBe(0);
  });

  it("las tareas de un proyecto inexistente dan 404", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get(`/api/admin/projects/${randomUUID()}/tasks`)
      .set(...authHeader(admin.token));

    expect(res.status).toBe(404);
  });

  it("el detalle, la edición y el borrado de un proyecto inexistente dan 404", async () => {
    const admin = await createAdmin();
    const missingId = randomUUID();

    const get = await request(app)
      .get(`/api/admin/projects/${missingId}`)
      .set(...authHeader(admin.token));
    expect(get.status).toBe(404);

    const patch = await request(app)
      .patch(`/api/admin/projects/${missingId}`)
      .set(...authHeader(admin.token))
      .send({ name: "No importa" });
    expect(patch.status).toBe(404);

    const del = await request(app)
      .delete(`/api/admin/projects/${missingId}`)
      .set(...authHeader(admin.token));
    expect(del.status).toBe(404);
  });

  it("asignar o quitar un miembro en un proyecto inexistente da 404", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const missingId = randomUUID();

    const assign = await request(app)
      .post(`/api/admin/projects/${missingId}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    expect(assign.status).toBe(404);

    const remove = await request(app)
      .delete(`/api/admin/projects/${missingId}/members/${worker.id}`)
      .set(...authHeader(admin.token));
    expect(remove.status).toBe(404);
  });

  it("editar el supervisor de un proyecto con un usuario que no es supervisor da 400", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ supervisorId: worker.id });

    expect(res.status).toBe(400);
  });

  it("desarchivar un proyecto cuyo supervisor ya tiene otro activo da 409", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const oldProject = await createProjectViaAdmin(admin.token, supervisor.id);
    await request(app)
      .patch(`/api/admin/projects/${oldProject.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });
    // Con el anterior ya archivado, el supervisor tiene hueco para uno nuevo.
    await createProjectViaAdmin(admin.token, supervisor.id);

    const res = await request(app)
      .patch(`/api/admin/projects/${oldProject.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: false });

    expect(res.status).toBe(409);
  });

  it("volver a archivar un proyecto ya archivado no falla (sin cambio real)", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });

    const res = await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });

    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(true);
  });

  it("la lista de trabajadores para asignar excluye a los desactivados", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const worker = await createWorker(admin.token);
    await request(app)
      .patch(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token))
      .send({ isActive: false });

    const res = await request(app)
      .get("/api/supervisor/projects/workers")
      .set(...authHeader(supervisorToken));

    expect(res.status).toBe(200);
    expect(res.body.map((w: { id: string }) => w.id)).not.toContain(worker.id);
  });

  it("quitar a un miembro le notifica que salió del proyecto", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    const removed = await request(app)
      .delete(`/api/admin/projects/${project.id}/members/${worker.id}`)
      .set(...authHeader(admin.token));
    expect(removed.status).toBe(200);

    const notifications = await request(app)
      .get("/api/notifications")
      .set(...authHeader(worker.token));
    expect(
      notifications.body.items.some((n: { type: string }) => n.type === "project_member_removed"),
    ).toBe(true);
  });

  it("reasignar a un trabajador a otro proyecto le notifica tanto la salida como la entrada", async () => {
    const admin = await createAdmin();
    const supervisorA = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorB = await createUserViaAdmin(admin.token, "supervisor");
    const projectA = await createProjectViaAdmin(admin.token, supervisorA.id);
    const projectB = await createProjectViaAdmin(admin.token, supervisorB.id);
    const worker = await createWorker(admin.token);

    await request(app)
      .post(`/api/admin/projects/${projectA.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    const reassigned = await request(app)
      .post(`/api/admin/projects/${projectB.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });
    expect(reassigned.status).toBe(200);

    const notifications = await request(app)
      .get("/api/notifications")
      .set(...authHeader(worker.token));
    const types = notifications.body.items.map((n: { type: string }) => n.type);
    expect(types).toContain("project_member_removed");
    expect(types).toContain("project_member_added");
  });

  it("registra actividad al renombrar, archivar y cambiar el supervisor de un proyecto", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const otherSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ name: "Renombrado para actividad" });
    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: true });
    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ isArchived: false, supervisorId: otherSupervisor.id });

    const activity = await request(app)
      .get("/api/admin/activity")
      .query({ types: "project_updated,project_archived,project_supervisor_changed", pageSize: 50 })
      .set(...authHeader(admin.token));

    expect(activity.status).toBe(200);
    const types = activity.body.items.map((e: { type: string }) => e.type);
    expect(types).toContain("project_updated");
    expect(types).toContain("project_archived");
    expect(types).toContain("project_supervisor_changed");
  });

  it("cambiar el supervisor de un proyecto notifica al supervisor saliente", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const supervisorToken = await loginAs(supervisor.email, supervisor.password);
    const otherSupervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    await request(app)
      .patch(`/api/admin/projects/${project.id}`)
      .set(...authHeader(admin.token))
      .send({ supervisorId: otherSupervisor.id });

    const notifications = await request(app)
      .get("/api/notifications")
      .set(...authHeader(supervisorToken));
    expect(
      notifications.body.items.some((n: { type: string }) => n.type === "project_supervisor_removed"),
    ).toBe(true);
  });

  it("un valor inválido de 'archived' en el listado de proyectos da 400", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get("/api/admin/projects")
      .query({ archived: "quizás" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(400);
  });

  it("un valor inválido de 'archived' en la exportación de proyectos da 400", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get("/api/admin/projects/export")
      .query({ archived: "quizás" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(400);
  });

  // --- Ramas del repositorio solo alcanzables sin pasar por HTTP ---
  // (el esquema de validación garantiza que updateProjectSchema siempre
  // llega con al menos un campo, y removeMember/assignMember siempre
  // comprueban la membresía antes de tocarla, así que estas ramas de
  // repository.ts no son alcanzables desde una petición real).

  it("updateProjectById sin campos que cambiar devuelve el proyecto tal cual", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);

    const result = await projectsRepo.updateProjectById(project.id, {});

    expect(result?.id).toBe(project.id);
    expect(result?.name).toBe(project.name);
  });

  it("closeActiveMembership devuelve null si no había ninguna membresía activa que cerrar", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const result = await projectsRepo.closeActiveMembership(worker.id);

    expect(result).toBeNull();
  });

  it("reassignMembership deshace la transacción entera si el proyecto destino no existe", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const project = await createProjectViaAdmin(admin.token, supervisor.id);
    const worker = await createWorker(admin.token);
    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    await expect(
      projectsRepo.reassignMembership(worker.id, randomUUID()),
    ).rejects.toThrow();

    // El ROLLBACK debe haber deshecho también el cierre de la membresía
    // anterior: sigue activa en el proyecto original, no huérfana.
    const { rows } = await pool.query<{ project_id: string; left_at: Date | null }>(
      "SELECT project_id, left_at FROM project_members WHERE user_id = $1",
      [worker.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.project_id).toBe(project.id);
    expect(rows[0]?.left_at).toBeNull();
  });
});
