import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

/**
 * Optionaler E-Mail-Versand über SMTP. Ohne Konfiguration werden keine E-Mails versendet
 * (und auch keine Links mit Tokens ins Log geschrieben). Passwort-Reset erfolgt dann
 * über einen von der Administration erzeugten Einmal-Link.
 */
let transporter: Transporter | null = null;

export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (!env.mailEnabled) {
    console.warn("[mail] SMTP nicht konfiguriert – E-Mail wurde nicht versendet.");
    return false;
  }
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });
  await transporter.sendMail({ from: env.smtp.from, to, subject, text });
  return true;
}
