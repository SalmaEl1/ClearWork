import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Debe ejecutarse antes de importar migrate.js: ese módulo lee
// DATABASE_URL en cuanto se importa (vía config/env.ts).
config({ path: path.resolve(__dirname, "../../.env.test"), override: true });

await import("./migrate.js");
