import pg, { Pool } from "pg";
import { env } from "../config/env.js";

// Una columna DATE no tiene zona horaria: es solo "año-mes-día". Por
// defecto, `pg` la convierte a un objeto Date de JavaScript interpretando
// la medianoche en la zona horaria local del proceso, y al volver a
// serializarla en UTC (p. ej. con toISOString()) el día puede desplazarse
// hacia atrás o hacia delante según esa zona. Se evita el problema de raíz
// dejando el valor tal cual lo devuelve PostgreSQL: la cadena 'AAAA-MM-DD'.
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);

// Render (y la mayoría de Postgres gestionados en la nube) exige TLS;
// Postgres local (docker-compose) no lo soporta. `rejectUnauthorized:
// false` porque el certificado de Render no siempre es verificable por
// la cadena de CAs por defecto de Node.
const isLocalDb = /localhost|127\.0\.0\.1/.test(env.DATABASE_URL);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  // Error en un cliente inactivo del pool: no debe tumbar el proceso,
  // pero sí queremos saberlo.
  console.error("Error inesperado en el pool de PostgreSQL", err);
});
