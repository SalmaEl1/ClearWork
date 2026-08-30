import type { TaskStatus } from "@clearwork/shared";

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "pendiente",
  in_progress: "en curso",
  done: "hecha",
};

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
  const subject = `Se le ha asignado una nueva tarea: ${input.taskTitle}`;

  const dueDateLine = input.dueDate ? `Fecha límite: ${input.dueDate}` : null;

  const text = [
    `Estimado/a ${input.fullName}:`,
    "",
    `Se le ha asignado la tarea "${input.taskTitle}" en el proyecto ${input.projectName}.`,
    ...(dueDateLine ? [dueDateLine] : []),
    "",
    `Puede consultarla en el siguiente enlace: ${input.taskUrl}`,
    "",
    SIGNATURE_TEXT,
  ].join("\n");

  const html = `
    <p>Estimado/a ${escapeHtml(input.fullName)}:</p>
    <p>Se le ha asignado la tarea <strong>${escapeHtml(input.taskTitle)}</strong> en el proyecto ${escapeHtml(input.projectName)}.</p>
    ${dueDateLine ? `<p>${escapeHtml(dueDateLine)}</p>` : ""}
    <p><a href="${escapeHtml(input.taskUrl)}">Consultar la tarea</a></p>
    ${SIGNATURE_HTML}
  `.trim();

  return { subject, text, html };
}

export type TaskStatusChangedEmailInput = {
  fullName: string;
  actorName: string;
  taskTitle: string;
  projectName: string;
  status: TaskStatus;
  taskUrl: string;
};

/** Correo a "la otra parte" cuando cambia el estado de una tarea: al
 * supervisor si cambia el trabajador, al trabajador asignado si cambia
 * el supervisor. Ver tasks/service.ts's updateTaskStatus. */
export function taskStatusChangedEmailTemplate(input: TaskStatusChangedEmailInput): EmailContent {
  const statusLabel = TASK_STATUS_LABEL[input.status];
  const subject = `Actualización del estado de la tarea: ${input.taskTitle}`;

  const text = [
    `Estimado/a ${input.fullName}:`,
    "",
    `Le informamos de que ${input.actorName} ha actualizado el estado de la tarea "${input.taskTitle}" (${input.projectName}) a ${statusLabel}.`,
    "",
    `Puede consultarla en el siguiente enlace: ${input.taskUrl}`,
    "",
    SIGNATURE_TEXT,
  ].join("\n");

  const html = `
    <p>Estimado/a ${escapeHtml(input.fullName)}:</p>
    <p>Le informamos de que ${escapeHtml(input.actorName)} ha actualizado el estado de la tarea <strong>${escapeHtml(input.taskTitle)}</strong> (${escapeHtml(input.projectName)}) a <strong>${escapeHtml(statusLabel)}</strong>.</p>
    <p><a href="${escapeHtml(input.taskUrl)}">Consultar la tarea</a></p>
    ${SIGNATURE_HTML}
  `.trim();

  return { subject, text, html };
}
