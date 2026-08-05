import nodemailer, { type Transporter } from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

/**
 * Send an email. This NEVER throws. When SMTP is not configured or sending
 * fails, the email (including any links) is logged to the console so reset
 * links stay visible during local setup.
 */
export async function sendMail({ to, subject, html, text }: MailOptions): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    logFallback(to, subject, text ?? html);
    return;
  }
  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@fit-it.local',
      to,
      subject,
      html,
      text: text ?? stripHtml(html),
    });
  } catch (err) {
    console.error('[mailer] send failed, logging email instead:', err);
    logFallback(to, subject, text ?? html);
  }
}

function logFallback(to: string, subject: string, body: string) {
  console.log(
    `[mailer] SMTP not configured, email not sent:\n  to: ${to}\n  subject: ${subject}\n  body:\n${body}\n`,
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
