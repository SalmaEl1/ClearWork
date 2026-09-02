const SIGNATURE_TEXT = "Atentamente,\nEl equipo de ClearWork";
const SIGNATURE_HTML = "<p>Atentamente,<br>El equipo de ClearWork</p>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type WelcomeEmailInput = {
  fullName: string;
  email: string;
  password: string;
  loginUrl: string;
};

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

/** Correo de bienvenida con la contraseña provisional, al crear una
 * cuenta desde el panel de admin. */
export function welcomeEmailTemplate(input: WelcomeEmailInput): EmailContent {
  const subject = "Creación de su cuenta en ClearWork";

  const text = [
    `Estimado/a ${input.fullName}:`,
    "",
    "Le confirmamos que se ha creado su cuenta en ClearWork.",
    "",
    `Correo electrónico: ${input.email}`,
    `Contraseña provisional: ${input.password}`,
    "",
    `Puede acceder desde el siguiente enlace y le recomendamos cambiar la contraseña provisional en cuanto inicie sesión: ${input.loginUrl}`,
    "",
    SIGNATURE_TEXT,
  ].join("\n");

  const html = `
    <p>Estimado/a ${escapeHtml(input.fullName)}:</p>
    <p>Le confirmamos que se ha creado su cuenta en ClearWork.</p>
    <p>
      <strong>Correo electrónico:</strong> ${escapeHtml(input.email)}<br>
      <strong>Contraseña provisional:</strong> ${escapeHtml(input.password)}
    </p>
    <p>
      Puede <a href="${escapeHtml(input.loginUrl)}">iniciar sesión aquí</a>.
      Le recomendamos cambiar la contraseña provisional en cuanto acceda, desde su perfil.
    </p>
    ${SIGNATURE_HTML}
  `.trim();

  return { subject, text, html };
}

export type PasswordResetEmailInput = {
  fullName: string;
  resetUrl: string;
};

/** Correo con el enlace de recuperación de contraseña autoservicio. El
 * enlace caduca (ver auth/service.ts), así que aquí solo se indica que
 * caduca, no cuándo exactamente — no vale la pena acoplar la plantilla a
 * ese detalle. */
export function passwordResetEmailTemplate(input: PasswordResetEmailInput): EmailContent {
  const subject = "Restablecimiento de su contraseña de ClearWork";

  const text = [
    `Estimado/a ${input.fullName}:`,
    "",
    "Hemos recibido una solicitud para restablecer la contraseña de su cuenta en ClearWork.",
    "",
    `Puede elegir una nueva contraseña desde el siguiente enlace (caduca en una hora): ${input.resetUrl}`,
    "",
    "Si no ha realizado esta solicitud, puede ignorar este correo: su contraseña actual seguirá siendo válida.",
    "",
    SIGNATURE_TEXT,
  ].join("\n");

  const html = `
    <p>Estimado/a ${escapeHtml(input.fullName)}:</p>
    <p>Hemos recibido una solicitud para restablecer la contraseña de su cuenta en ClearWork.</p>
    <p>
      Puede <a href="${escapeHtml(input.resetUrl)}">elegir una nueva contraseña aquí</a>
      (el enlace caduca en una hora).
    </p>
    <p>Si no ha realizado esta solicitud, puede ignorar este correo: su contraseña actual seguirá siendo válida.</p>
    ${SIGNATURE_HTML}
  `.trim();

  return { subject, text, html };
}

export type NotificationEmailInput = {
  fullName: string;
  message: string;
  link: string | null;
};

/**
 * Correo genérico para cualquier tipo de notificación (issue #112): el
 * mismo texto que se ve dentro de la plataforma (notificationMessage, en
 * @clearwork/shared), en vez de una plantilla dedicada por tipo. Antes
 * solo task_assigned y task_status_changed tenían su propio correo
 * (taskAssignedEmailTemplate / taskStatusChangedEmailTemplate, más
 * abajo); ahora que cualquier tipo puede mandarse por correo según la
 * preferencia de cada persona, mantener una plantilla distinta por tipo
 * habría significado escribir y mantener ocho más solo para esto.
 */
export function notificationEmailTemplate(input: NotificationEmailInput): EmailContent {
  const subject = "Tiene una notificación nueva en ClearWork";

  const text = [
    `Estimado/a ${input.fullName}:`,
    "",
    input.message,
    ...(input.link ? ["", `Puede consultarlo en el siguiente enlace: ${input.link}`] : []),
    "",
    SIGNATURE_TEXT,
  ].join("\n");

  const html = `
    <p>Estimado/a ${escapeHtml(input.fullName)}:</p>
    <p>${escapeHtml(input.message)}</p>
    ${input.link ? `<p><a href="${escapeHtml(input.link)}">Consultarlo aquí</a></p>` : ""}
    ${SIGNATURE_HTML}
  `.trim();

  return { subject, text, html };
}

