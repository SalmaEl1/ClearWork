import sgMail from "@sendgrid/mail";
import { env } from "../config/env.js";
import type { EmailContent } from "./templates.js";

let isConfigured = false;

function ensureConfigured(): void {
  if (isConfigured) return;
  if (!env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY no está configurada");
  }
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  isConfigured = true;
}

/**
 * Envía un correo por SendGrid. Lanza si SENDGRID_API_KEY o
 * SENDGRID_FROM_EMAIL no están configuradas, o si SendGrid rechaza el
 * envío — quien llama decide qué hacer con ese fallo (ver
 * admin/service.ts: no bloquea la creación de la cuenta).
 */
export async function sendMail(to: string, content: EmailContent): Promise<void> {
  ensureConfigured();
  if (!env.SENDGRID_FROM_EMAIL) {
    throw new Error("SENDGRID_FROM_EMAIL no está configurada");
  }

  await sgMail.send({
    to,
    from: env.SENDGRID_FROM_EMAIL,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}
