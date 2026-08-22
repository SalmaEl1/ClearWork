import crypto from "node:crypto";

// Sin caracteres ambiguos al leerlos (0/O, 1/l/I): la contraseña la va a
// teclear alguien a mano desde un correo, normalmente desde el móvil.
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Contraseña provisional aleatoria para cuentas creadas desde el panel
 * de admin. crypto.randomInt, no Math.random: es la que se manda por
 * correo, tiene que ser impredecible de verdad. */
export function generatePassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += CHARSET[crypto.randomInt(CHARSET.length)]!;
  }
  return password;
}
