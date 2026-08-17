import { pool } from "../../db/pool.js";

export type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

export async function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
}

/** Solo un token sin usar y todavía dentro de plazo cuenta como válido;
 * uno caducado o ya canjeado no, aunque siga en la tabla. */
export async function findValidPasswordResetToken(
  tokenHash: string,
): Promise<PasswordResetTokenRow | null> {
  const result = await pool.query<PasswordResetTokenRow>(
    "SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()",
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(id: string): Promise<void> {
  await pool.query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [id]);
}

/** Tras canjear un token, cualquier otro enlace de recuperación que
 * hubiera pedido antes esa misma persona (y no hubiera usado) deja de
 * servir — evita que un enlace viejo siga siendo válido tras cambiar ya
 * la contraseña con uno más reciente. */
export async function deleteUnusedPasswordResetTokensForUser(userId: string): Promise<void> {
  await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL", [
    userId,
  ]);
}
