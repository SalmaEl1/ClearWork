import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../db/migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations",
  );
  return new Set(result.rows.map((row) => row.filename));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const allFiles = await readdir(MIGRATIONS_DIR);
  const pending = allFiles.filter((f) => f.endsWith(".sql") && !applied.has(f)).sort();

  if (pending.length === 0) {
    console.log("No hay migraciones pendientes.");
    return;
  }

  for (const filename of pending) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = await readFile(filePath, "utf-8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
        filename,
      ]);
      await client.query("COMMIT");
      console.log(`Aplicada: ${filename}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Fallo al aplicar ${filename}`);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`${pending.length} migración(es) aplicada(s).`);
}

runMigrations()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
