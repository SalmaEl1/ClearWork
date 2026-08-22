import { randomUUID } from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/db/pool.js";
import { createAccount } from "../src/modules/users/service.js";
import type { Role } from "@clearwork/shared";

export const app = createApp();

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@test.clearwork.dev`;
}

export function authHeader(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`];
}

/**
 * Crea un admin directamente contra la base de datos (sin pasar por
 * HTTP): no existe un endpoint de autorregistro para el rol admin en la
 * app real tampoco — el primero se crea con db/seedAdmin.ts — así que los
 * tests reproducen ese mismo atajo con una contraseña conocida.
 */
export async function createAdmin(fullName = "Admin de test") {
  const email = uniqueEmail("admin");
  const password = "AdminTest1234";
  const { user } = await createAccount({ email, password, fullName, role: "admin" });
  const login = await request(app).post("/api/auth/login").send({ email, password });
  return { user, email, password, token: login.body.token as string };
}

/**
 * Crea una cuenta a través del endpoint real del panel de admin. Sin
 * SendGrid configurado en tests (ver .env.test), el envío de correo
 * siempre falla de forma controlada y la contraseña provisional vuelve
 * en claro en la respuesta — igual que en producción cuando el correo no
 * se puede mandar.
 */
export async function createUserViaAdmin(
  adminToken: string,
  role: Role,
  fullName = "Usuario de test",
) {
  const email = uniqueEmail(role);
  const res = await request(app)
    .post("/api/admin/users")
    .set(...authHeader(adminToken))
    .send({ email, fullName, role });
  if (res.status !== 201) {
    throw new Error(`No se pudo crear el usuario de test: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { ...res.body, email, password: res.body.temporaryPassword as string };
}

export async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login de test falló: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

/** Crea un trabajador vía admin y ya devuelve su token: el atajo que
 * necesita casi cualquier test que no sea del propio módulo de admin. */
export async function createWorker(adminToken: string) {
  const worker = await createUserViaAdmin(adminToken, "worker");
  const token = await loginAs(worker.email, worker.password);
  return { ...worker, token };
}

export async function createProjectViaAdmin(
  adminToken: string,
  supervisorId: string,
  name = `Proyecto de test ${randomUUID()}`,
) {
  const res = await request(app)
    .post("/api/admin/projects")
    .set(...authHeader(adminToken))
    .send({ name, supervisorId });
  if (res.status !== 201) {
    throw new Error(`No se pudo crear el proyecto de test: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

export async function closePool() {
  await pool.end();
}
