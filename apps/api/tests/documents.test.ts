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

function attachDocument(req: request.Test, recipientIds: string[], label = "Nómina de mayo") {
  return req
    .field("label", label)
    .field("recipientIds", JSON.stringify(recipientIds))
    .attach("file", Buffer.from("contenido de prueba"), "nomina.pdf");
}

describe("documentos compartidos", () => {
  afterAll(closePool);

  it("un admin comparte un documento con un trabajador, que lo ve y lo descarga", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const created = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(admin.token)),
      [worker.id],
    );
    expect(created.status).toBe(201);
    expect(created.body.label).toBe("Nómina de mayo");
    expect(created.body.recipients).toEqual([{ userId: worker.id, fullName: worker.fullName }]);

    const mine = await request(app).get("/api/documents/mine").set(...authHeader(worker.token));
    expect(mine.status).toBe(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].label).toBe("Nómina de mayo");

    const download = await request(app)
      .get(`/api/documents/${created.body.id}/download`)
      .set(...authHeader(worker.token));
    expect(download.status).toBe(200);
    expect(download.headers["content-disposition"]).toContain("nomina.pdf");
  });

  it("un supervisor comparte un documento con alguien de su equipo", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    const created = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(supervisorToken)),
      [worker.id],
    );
    expect(created.status).toBe(201);

    const mine = await request(app).get("/api/documents/mine").set(...authHeader(worker.token));
    expect(mine.body).toHaveLength(1);
  });

  it("un supervisor no puede compartir con quien no es de su equipo", async () => {
    const admin = await createAdmin();
    const outsider = await createWorker(admin.token);
    const { supervisorToken } = await setupTeam(admin.token);

    const created = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(supervisorToken)),
      [outsider.id],
    );
    expect(created.status).toBe(403);
  });

  it("se puede compartir con varios trabajadores a la vez (de forma colectiva)", async () => {
    const admin = await createAdmin();
    const workerA = await createWorker(admin.token);
    const workerB = await createWorker(admin.token);

    const created = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(admin.token)),
      [workerA.id, workerB.id],
    );
    expect(created.status).toBe(201);
    expect(created.body.recipients).toHaveLength(2);

    const mineA = await request(app).get("/api/documents/mine").set(...authHeader(workerA.token));
    const mineB = await request(app).get("/api/documents/mine").set(...authHeader(workerB.token));
    expect(mineA.body).toHaveLength(1);
    expect(mineB.body).toHaveLength(1);
  });

  it("compartir un documento notifica a cada destinatario", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    await attachDocument(request(app).post("/api/documents").set(...authHeader(admin.token)), [worker.id]);

    const notifications = await request(app)
      .get("/api/notifications")
      .set(...authHeader(worker.token));
    expect(
      notifications.body.items.some((n: { type: string }) => n.type === "document_shared"),
    ).toBe(true);
  });

  it("quien no es destinatario no puede descargar el documento", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);
    const outsider = await createWorker(admin.token);

    const created = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(admin.token)),
      [worker.id],
    );

    const res = await request(app)
      .get(`/api/documents/${created.body.id}/download`)
      .set(...authHeader(outsider.token));
    expect(res.status).toBe(404);
  });

  it("un trabajador no puede compartir documentos", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(worker.token)),
      [worker.id],
    );
    expect(res.status).toBe(403);
  });

  it("rechaza compartir sin archivo adjunto", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/documents")
      .set(...authHeader(admin.token))
      .field("label", "Sin archivo")
      .field("recipientIds", JSON.stringify([worker.id]));

    expect(res.status).toBe(400);
  });

  it("rechaza compartir sin ningún destinatario", async () => {
    const admin = await createAdmin();

    const res = await attachDocument(request(app).post("/api/documents").set(...authHeader(admin.token)), []);
    expect(res.status).toBe(400);
  });

  it("rechaza un destinatario que no es un trabajador", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");

    const res = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(admin.token)),
      [supervisor.id],
    );
    expect(res.status).toBe(400);
  });

  it("rechaza un archivo que supere el tamaño máximo, con un 400 claro (no un 500)", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    const res = await request(app)
      .post("/api/documents")
      .set(...authHeader(admin.token))
      .field("label", "Archivo enorme")
      .field("recipientIds", JSON.stringify([worker.id]))
      .attach("file", oversized, "enorme.pdf");

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("tamaño máximo");
  });

  it("rechaza una solicitud con más campos de texto de los esperados", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const res = await request(app)
      .post("/api/documents")
      .set(...authHeader(admin.token))
      .field("label", "Con campo de más")
      .field("recipientIds", JSON.stringify([worker.id]))
      .field("campoInesperado", "x")
      .attach("file", Buffer.from("contenido de prueba"), "nomina.pdf");

    expect(res.status).toBe(400);
  });

  it("quien lo compartió puede eliminarlo, y deja de poder descargarse", async () => {
    const admin = await createAdmin();
    const worker = await createWorker(admin.token);

    const created = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(admin.token)),
      [worker.id],
    );

    const deleted = await request(app)
      .delete(`/api/documents/${created.body.id}`)
      .set(...authHeader(admin.token));
    expect(deleted.status).toBe(204);

    const download = await request(app)
      .get(`/api/documents/${created.body.id}/download`)
      .set(...authHeader(worker.token));
    expect(download.status).toBe(404);
  });

  it("un supervisor no puede eliminar el documento de otro supervisor", async () => {
    const admin = await createAdmin();
    const { worker } = await setupTeam(admin.token);
    const { supervisorToken: otherSupervisorToken } = await setupTeam(admin.token);

    const created = await attachDocument(
      request(app).post("/api/documents").set(...authHeader(admin.token)),
      [worker.id],
    );

    const res = await request(app)
      .delete(`/api/documents/${created.body.id}`)
      .set(...authHeader(otherSupervisorToken));
    expect(res.status).toBe(403);
  });

  it("el admin y el supervisor ven lo que han compartido en /documents/sent", async () => {
    const admin = await createAdmin();
    const { supervisorToken, worker } = await setupTeam(admin.token);

    await attachDocument(
      request(app).post("/api/documents").set(...authHeader(supervisorToken)),
      [worker.id],
      "Política de empresa",
    );

    const sentBySupervisor = await request(app).get("/api/documents/sent").set(...authHeader(supervisorToken));
    expect(sentBySupervisor.status).toBe(200);
    expect(sentBySupervisor.body.some((d: { label: string }) => d.label === "Política de empresa")).toBe(true);

    const sentByAdmin = await request(app).get("/api/documents/sent").set(...authHeader(admin.token));
    expect(sentByAdmin.body.some((d: { label: string }) => d.label === "Política de empresa")).toBe(true);
  });
});
