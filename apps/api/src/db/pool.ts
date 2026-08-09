import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on("error", (err) => {
  // Error en un cliente inactivo del pool: no debe tumbar el proceso,
  // pero sí queremos saberlo.
  console.error("Error inesperado en el pool de PostgreSQL", err);
});
