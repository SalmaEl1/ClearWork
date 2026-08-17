import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env.test"), override: true });

const { pool } = await import("./pool.js");

// Vacía todas las tablas de datos (no schema_migrations, y tampoco
// app_settings: es una fila singleton que la migración 006 inserta una
// sola vez, truncarla la dejaría sin fila) antes de cada tanda de tests,
// para que no se acumulen filas entre ejecuciones. CASCADE arrastra las
// tablas dependientes sin importar el orden de la lista.
// Sin RESTART IDENTITY: todas las claves primarias son UUID generadas por
// gen_random_uuid(), no hay ninguna secuencia que reiniciar.
await pool.query(
  `TRUNCATE users, projects, tasks, task_status_history, project_members, work_sessions, breaks,
            activity_log, password_reset_tokens
   CASCADE`,
);
await pool.end();
console.log("Base de datos de test vaciada.");
