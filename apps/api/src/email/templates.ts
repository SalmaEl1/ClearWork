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
