import rateLimit from "express-rate-limit";

// Los tests de integración lanzan decenas de logins seguidos desde la
// misma IP en minutos (cada test crea su propio admin y hace login) —
// aplicarles el mismo límite que a un usuario real los volvería
// intermitentes sin que hubiera ningún problema real que detectar.
const skipInTests = () => process.env.NODE_ENV === "test";

/**
 * Límite general: una red de seguridad contra abuso básico de la API,
 * no una defensa fina. 300 peticiones cada 15 min por IP es holgado para
 * el uso normal del panel (listados, refrescos) pero corta un bucle
 * descontrolado o un script sin control de ritmo.
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
});

/**
 * Límite estricto solo para login: la puerta de entrada expuesta a
 * fuerza bruta. 10 intentos cada 15 min por IP — de sobra para un
 * despiste de contraseña, no para probar un diccionario.
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Demasiados intentos de inicio de sesión. Prueba de nuevo en unos minutos." },
});

/**
 * Igual de estricto que el login, y por el mismo motivo: es una puerta de
 * entrada pública sin autenticar. Además evita que alguien use este
 * endpoint para bombardear de correos a una cuenta ajena.
 */
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Demasiadas solicitudes. Prueba de nuevo en unos minutos." },
});
