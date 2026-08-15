import { env } from "../config/env.js";
import { listUsersByRole } from "../modules/users/repository.js";
import { createAccount } from "../modules/users/service.js";
import { pool } from "./pool.js";

/**
 * Crea el primer usuario admin, leyendo credenciales del entorno.
 * Idempotente: si ya existe algún admin, no hace nada. Es la única vía
 * para tener un admin, ya que no hay autoregistro público para ese rol.
 */
async function seedAdmin() {
  const existingAdmins = await listUsersByRole("admin");
  if (existingAdmins.length > 0) {
    console.log("Ya existe al menos un admin, no se crea ninguno nuevo.");
    return;
  }

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.ADMIN_FULL_NAME) {
    throw new Error(
      "Faltan ADMIN_EMAIL, ADMIN_PASSWORD o ADMIN_FULL_NAME en el entorno " +
        "(añádelos a tu .env) para poder crear el primer admin.",
    );
  }

  const { user } = await createAccount({
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    fullName: env.ADMIN_FULL_NAME,
    role: "admin",
  });

  console.log(`Admin creado: ${user.email}`);
}

seedAdmin()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
