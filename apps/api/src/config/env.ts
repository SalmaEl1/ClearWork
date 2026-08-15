import "dotenv/config";
import { z } from "zod";

/**
 * Para variables opcionales: `.optional()` solo perdona `undefined`, no
 * una variable presente en el .env pero vacía ("") — con
 * `z.string().email().optional()`, un `SENDGRID_FROM_EMAIL=` vacío
 * cuenta como "puesta pero inválida" y falla igual. Aquí se convierte ""
 * en undefined antes de validar, así que una variable opcional realmente
 * vacía se trata como no puesta.
 */
function optionalEnv<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Solo los usa db/seedAdmin.ts para crear el primer admin. Opcionales
  // aquí para no exigirlos al arrancar el servidor normal; el propio
  // script comprueba que estén presentes antes de usarlos.
  ADMIN_EMAIL: optionalEnv(z.string().email()),
  ADMIN_PASSWORD: optionalEnv(z.string().min(8)),
  ADMIN_FULL_NAME: optionalEnv(z.string().min(1)),

  // Envío del correo de bienvenida con la contraseña provisional al crear
  // una cuenta desde el panel de admin. Opcionales: si faltan, el envío
  // falla de forma controlada y el admin ve la contraseña en pantalla
  // para compartirla a mano (ver admin/service.ts).
  SENDGRID_API_KEY: optionalEnv(z.string()),
  SENDGRID_FROM_EMAIL: optionalEnv(z.string().email()),
  // URL pública del frontend, para el enlace de "inicia sesión" del correo.
  APP_URL: z.string().default("http://localhost:5173"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuración de entorno inválida. Revisa tu archivo .env:\n${details}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
