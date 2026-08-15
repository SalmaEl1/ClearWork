import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Se ejecuta antes de que cualquier test importe código de la app: fuerza
// DATABASE_URL (y el resto de variables) a los valores de .env.test, para
// que config/env.ts los recoja ya puestos y no lea el .env de desarrollo.
config({ path: path.resolve(__dirname, "../.env.test"), override: true });
