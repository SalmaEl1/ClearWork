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
  uniqueEmail,
} from "./helpers.js";

// Este archivo cubre el CRUD de cuentas del panel de admin que
// admin-users.test.ts (centrado en fecha de contratación/tipo de
// contrato) y admin-self-protection.test.ts (centrado en las
// restricciones sobre la propia cuenta) no ejercitan: creación con email
// duplicado, consulta y listado paginado con filtros, exportación a CSV,
// borrado con conflicto de clave ajena, y cambio de rol con sus efectos
// colaterales (proyectos supervisados, membresía de un trabajador).

describe("creación de cuentas: email duplicado", () => {
  it("rechaza crear una cuenta con un email que ya existe", async () => {
    const admin = await createAdmin();
    const email = uniqueEmail("worker");

    const first = await request(app)
      .post("/api/admin/users")
      .set(...authHeader(admin.token))
      .send({
        email,
        fullName: "Primera cuenta",
        role: "worker",
        hireDate: "2026-01-01",
        contractType: "full_time",
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/admin/users")
      .set(...authHeader(admin.token))
      .send({
        email,
        fullName: "Segunda cuenta",
        role: "worker",
        hireDate: "2026-01-01",
        contractType: "full_time",
      });

    expect(second.status).toBe(409);
  });
});

describe("consulta de una cuenta por id", () => {
  it("devuelve 404 si el usuario no existe", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get("/api/admin/users/00000000-0000-0000-0000-000000000000")
      .set(...authHeader(admin.token));

    expect(res.status).toBe(404);
  });

  it("incluye los proyectos que supervisa una cuenta de supervisor", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const projectName = `Proyecto supervisado ${Date.now()}`;
    const project = await createProjectViaAdmin(admin.token, supervisor.id, projectName);

    const res = await request(app)
      .get(`/api/admin/users/${supervisor.id}`)
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.supervisedProjects).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: project.id, name: projectName })]),
    );
  });

  it("incluye el proyecto actual de un trabajador con membresía activa", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const projectName = `Proyecto del trabajador ${Date.now()}`;
    const project = await createProjectViaAdmin(admin.token, supervisor.id, projectName);
    const worker = await createUserViaAdmin(admin.token, "worker");

    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    const res = await request(app)
      .get(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.currentProjectId).toBe(project.id);
    expect(res.body.currentProjectName).toBe(projectName);
  });
});

describe("listado paginado de cuentas con filtros", () => {
  it("sin filtro, devuelve cuentas de cualquier rol", async () => {
    const admin = await createAdmin();
    await createUserViaAdmin(admin.token, "worker");
    await createUserViaAdmin(admin.token, "supervisor");

    const res = await request(app)
      .get("/api/admin/users")
      .query({ pageSize: 1000 })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3); // el propio admin + los dos creados
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it("filtra por rol", async () => {
    const admin = await createAdmin();
    const marker = Date.now();
    await createUserViaAdmin(admin.token, "supervisor", `Supervisor filtro ${marker}`);
    await createUserViaAdmin(admin.token, "worker", `Worker filtro ${marker}`);

    const res = await request(app)
      .get("/api/admin/users")
      .query({ role: "supervisor", pageSize: 1000 })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.items.every((u: { role: string }) => u.role === "supervisor")).toBe(true);
    expect(
      res.body.items.some((u: { fullName: string }) => u.fullName === `Supervisor filtro ${marker}`),
    ).toBe(true);
  });

  it("filtra por búsqueda de nombre o email", async () => {
    const admin = await createAdmin();
    const marker = Date.now();
    const fullName = `Nombre Único Búsqueda ${marker}`;
    await createUserViaAdmin(admin.token, "worker", fullName);
    await createUserViaAdmin(admin.token, "worker", `Otro nombre ${marker}`);

    const res = await request(app)
      .get("/api/admin/users")
      .query({ search: `Único Búsqueda ${marker}`, pageSize: 1000 })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].fullName).toBe(fullName);
  });

  it("combina búsqueda y rol a la vez", async () => {
    const admin = await createAdmin();
    const marker = Date.now();
    const fullName = `Combinado ${marker}`;
    await createUserViaAdmin(admin.token, "worker", fullName);
    // Mismo nombre pero rol distinto: no debe salir en el filtro combinado.
    await createUserViaAdmin(admin.token, "supervisor", fullName);

    const res = await request(app)
      .get("/api/admin/users")
      .query({ search: String(marker), role: "worker", pageSize: 1000 })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].role).toBe("worker");
  });

  it("pagina correctamente con pageSize pequeño", async () => {
    const admin = await createAdmin();
    const marker = Date.now();
    for (let i = 0; i < 3; i++) {
      await createUserViaAdmin(admin.token, "worker", `Paginado ${marker} ${i}`);
    }

    const res = await request(app)
      .get("/api/admin/users")
      .query({ search: `Paginado ${marker}`, page: 1, pageSize: 2 })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
  });

  it("rechaza un rol que no existe en el filtro de la lista", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get("/api/admin/users")
      .query({ role: "not_a_real_role" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(400);
  });
});

describe("exportación de cuentas a CSV", () => {
  it("exporta con cabecera y una fila por cuenta, respetando el filtro de rol", async () => {
    const admin = await createAdmin();
    const fullName = `Exportado CSV ${Date.now()}`;
    await createUserViaAdmin(admin.token, "worker", fullName);

    const res = await request(app)
      .get("/api/admin/users/export")
      .query({ role: "worker" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Nombre,Email,Rol,Activa");
    expect(res.text).toContain(fullName);
  });

  it("rechaza un rol que no existe en el filtro de exportación", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get("/api/admin/users/export")
      .query({ role: "not_a_real_role" })
      .set(...authHeader(admin.token));

    expect(res.status).toBe(400);
  });
});

describe("eliminar una cuenta", () => {
  it("devuelve 404 si el usuario no existe", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .delete("/api/admin/users/00000000-0000-0000-0000-000000000000")
      .set(...authHeader(admin.token));

    expect(res.status).toBe(404);
  });

  it("no se puede eliminar una cuenta con proyectos asociados", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    await createProjectViaAdmin(admin.token, supervisor.id);

    const res = await request(app)
      .delete(`/api/admin/users/${supervisor.id}`)
      .set(...authHeader(admin.token));

    expect(res.status).toBe(409);
    expect(res.body.message ?? res.body.error).toMatch(/proyectos, tareas o historial/);
  });
});

describe("cambiar el rol de una cuenta", () => {
  it("no se puede cambiar el rol de un supervisor que todavía tiene proyectos a su cargo", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    await createProjectViaAdmin(admin.token, supervisor.id);

    const res = await request(app)
      .patch(`/api/admin/users/${supervisor.id}`)
      .set(...authHeader(admin.token))
      .send({ role: "worker" });

    expect(res.status).toBe(409);
    expect(res.body.message ?? res.body.error).toMatch(/todavía supervisa/);
  });

  it("cambiar el rol de un trabajador sin proyecto asignado no da ningún conflicto", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");

    const res = await request(app)
      .patch(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token))
      .send({ role: "supervisor" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("supervisor");
  });

  it("cambiar el rol de un trabajador con proyecto asignado le saca del proyecto y registra el evento", async () => {
    const admin = await createAdmin();
    const supervisor = await createUserViaAdmin(admin.token, "supervisor");
    const projectName = `Proyecto salida ${Date.now()}`;
    const project = await createProjectViaAdmin(admin.token, supervisor.id, projectName);
    const worker = await createUserViaAdmin(admin.token, "worker", `Sale del proyecto ${Date.now()}`);

    await request(app)
      .post(`/api/admin/projects/${project.id}/members`)
      .set(...authHeader(admin.token))
      .send({ userId: worker.id });

    const res = await request(app)
      .patch(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token))
      .send({ role: "supervisor" });

    expect(res.status).toBe(200);
    expect(res.body.currentProjectId).toBeNull();

    const activity = await request(app)
      .get("/api/admin/activity")
      .query({ types: "member_left", pageSize: 100 })
      .set(...authHeader(admin.token));
    expect(
      activity.body.items.some(
        (e: { userName?: string; projectName?: string }) =>
          e.userName === worker.fullName && e.projectName === projectName,
      ),
    ).toBe(true);
  });

  it("no se puede actualizar una cuenta con el email de otra cuenta ya existente", async () => {
    const admin = await createAdmin();
    const userA = await createUserViaAdmin(admin.token, "worker");
    const userB = await createUserViaAdmin(admin.token, "worker");

    const res = await request(app)
      .patch(`/api/admin/users/${userB.id}`)
      .set(...authHeader(admin.token))
      .send({ email: userA.email });

    expect(res.status).toBe(409);
  });

  it("actualizar el nombre de una cuenta registra un evento de actividad", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");
    const newName = `Nombre actualizado ${Date.now()}`;

    const res = await request(app)
      .patch(`/api/admin/users/${worker.id}`)
      .set(...authHeader(admin.token))
      .send({ fullName: newName });

    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe(newName);

    const activity = await request(app)
      .get("/api/admin/activity")
      .query({ types: "user_updated", pageSize: 100 })
      .set(...authHeader(admin.token));
    expect(activity.body.items.some((e: { userName?: string }) => e.userName === newName)).toBe(true);
  });

  it("devuelve 404 al actualizar una cuenta que no existe", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .patch("/api/admin/users/00000000-0000-0000-0000-000000000000")
      .set(...authHeader(admin.token))
      .send({ fullName: "No existe" });

    expect(res.status).toBe(404);
  });
});

describe("reenvío del correo de bienvenida", () => {
  afterAll(closePool);

  it("devuelve 404 si el usuario no existe", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post("/api/admin/users/00000000-0000-0000-0000-000000000000/resend-welcome")
      .set(...authHeader(admin.token));

    expect(res.status).toBe(404);
  });

  it("regenera la contraseña y permite iniciar sesión con la nueva", async () => {
    const admin = await createAdmin();
    const worker = await createUserViaAdmin(admin.token, "worker");

    const res = await request(app)
      .post(`/api/admin/users/${worker.id}/resend-welcome`)
      .set(...authHeader(admin.token));

    expect(res.status).toBe(200);
    // Sin SendGrid configurado en tests, el envío siempre falla de forma
    // controlada y la contraseña provisional vuelve en claro (ver
    // helpers.ts / .env.test).
    expect(res.body.passwordEmailSent).toBe(false);
    expect(typeof res.body.temporaryPassword).toBe("string");

    // La contraseña anterior deja de servir...
    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: worker.email, password: worker.password });
    expect(oldLogin.status).toBe(401);

    // ...y la nueva sí permite entrar.
    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: worker.email, password: res.body.temporaryPassword });
    expect(newLogin.status).toBe(200);
  });
});
