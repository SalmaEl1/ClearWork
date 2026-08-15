import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env.test"), override: true });

// `CREATE DATABASE` no se puede ejecutar contra la propia base de datos
// de test si todavía no existe, así que esta conexión se hace contra la
// base de datos de mantenimiento `postgres` del mismo servidor.
const testUrl = new URL(process.env.DATABASE_URL as string);
const dbName = testUrl.pathname.replace(/^\//, "");
const maintenanceUrl = new URL(testUrl);
maintenanceUrl.pathname = "/postgres";

const client = new Client({ connectionString: maintenanceUrl.toString() });
await client.connect();
try {
  await client.query(`CREATE DATABASE "${dbName}"`);
  console.log(`Base de datos de test creada: ${dbName}`);
} catch (err) {
  const code = (err as { code?: string }).code;
  if (code === "42P04") {
    console.log(`La base de datos de test ya existe: ${dbName}`);
  } else {
    throw err;
  }
} finally {
  await client.end();
}
