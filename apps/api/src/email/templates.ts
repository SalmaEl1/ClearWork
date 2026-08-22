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
  const subject = "Tu cuenta en ClearWork";

  const text = [
    `Hola ${input.fullName},`,
    "",
    "Se ha creado tu cuenta en ClearWork.",
    "",
    `Email: ${input.email}`,
    `Contraseña provisional: ${input.password}`,
    "",
    `Inicia sesión aquí y cámbiala cuanto antes desde tu perfil: ${input.loginUrl}`,
    "",
    "— ClearWork",
  ].join("\n");

  const html = `
    <p>Hola ${escapeHtml(input.fullName)},</p>
    <p>Se ha creado tu cuenta en ClearWork.</p>
    <p>
      <strong>Email:</strong> ${escapeHtml(input.email)}<br>
      <strong>Contraseña provisional:</strong> ${escapeHtml(input.password)}
    </p>
    <p>
      <a href="${escapeHtml(input.loginUrl)}">Inicia sesión</a>
      y cámbiala cuanto antes desde tu perfil.
    </p>
    <p>— ClearWork</p>
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
  const subject = "Recupera tu contraseña de ClearWork";

  const text = [
    `Hola ${input.fullName},`,
    "",
    "Has pedido restablecer tu contraseña de ClearWork.",
    "",
    `Elige una nueva aquí (el enlace caduca en una hora): ${input.resetUrl}`,
    "",
    "Si no has sido tú, puedes ignorar este correo: tu contraseña actual sigue funcionando.",
    "",
    "— ClearWork",
  ].join("\n");

  const html = `
    <p>Hola ${escapeHtml(input.fullName)},</p>
    <p>Has pedido restablecer tu contraseña de ClearWork.</p>
    <p>
      <a href="${escapeHtml(input.resetUrl)}">Elige una nueva contraseña</a>
      (el enlace caduca en una hora).
    </p>
    <p>Si no has sido tú, puedes ignorar este correo: tu contraseña actual sigue funcionando.</p>
    <p>— ClearWork</p>
  `.trim();

  return { subject, text, html };
}

export type TaskAssignedEmailInput = {
  fullName: string;
  taskTitle: string;
  projectName: string;
  dueDate: string | null;
  taskUrl: string;
};

/** Correo al trabajador cuando una tarea se le asigna (al crearla o al
 * reasignarla), tanto desde tasks/service.ts. */
export function taskAssignedEmailTemplate(input: TaskAssignedEmailInput): EmailContent {
  const subject = `Nueva tarea asignada: ${input.taskTitle}`;

  const dueDateLine = input.dueDate ? `Fecha límite: ${input.dueDate}` : null;

  const text = [
    `Hola ${input.fullName},`,
    "",
    `Se te ha asignado la tarea "${input.taskTitle}" en el proyecto ${input.projectName}.`,
    ...(dueDateLine ? [dueDateLine] : []),
    "",
    `Puedes verla aquí: ${input.taskUrl}`,
    "",
    "— ClearWork",
  ].join("\n");

  const html = `
    <p>Hola ${escapeHtml(input.fullName)},</p>
    <p>Se te ha asignado la tarea <strong>${escapeHtml(input.taskTitle)}</strong> en el proyecto ${escapeHtml(input.projectName)}.</p>
    ${dueDateLine ? `<p>${escapeHtml(dueDateLine)}</p>` : ""}
    <p><a href="${escapeHtml(input.taskUrl)}">Ver la tarea</a></p>
    <p>— ClearWork</p>
  `.trim();

  return { subject, text, html };
}
