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

export type MailResult = { ok: true } | { ok: false; reason: string };

/**
 * Send an email. This NEVER throws. When SMTP is not configured or sending
 * fails, the email is logged to the console — with the full body (reset links
 * included) only in development. Production logs never contain reset links:
 * anyone who can read the logs could otherwise take over accounts.
 *
 * Returns whether the mail actually left the building — the admin test send
 * reported "sent ✅" for months while SMTP was unconfigured because every
 * caller assumed resolve = delivered.
 */
export async function sendMail({ to, subject, html, text }: MailOptions): Promise<MailResult> {
  const tx = getTransporter();
  if (!tx) {
    logFallback(to, subject, text ?? html);
    return { ok: false, reason: 'SMTP not configured (SMTP_HOST is not set in .env)' };
  }
  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@fit-it.local',
      to,
      subject,
      html,
      text: text ?? stripHtml(html),
    });
    return { ok: true };
  } catch (err) {
    console.error('[mailer] send failed:', err);
    logFallback(to, subject, text ?? html);
    return { ok: false, reason: err instanceof Error ? err.message : 'SMTP send failed' };
  }
}

/** Connect + authenticate against the configured SMTP server without sending
 *  anything — the truth-teller behind the admin "check SMTP" button. */
export async function verifySmtp(): Promise<MailResult> {
  const tx = getTransporter();
  if (!tx) return { ok: false, reason: 'SMTP not configured (SMTP_HOST is not set in .env)' };
  try {
    await tx.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'SMTP verify failed' };
  }
}

function logFallback(to: string, subject: string, body: string) {
  if (process.env.NODE_ENV === 'production') {
    console.error(`[mailer] email NOT sent (SMTP down or unconfigured): to=${to} subject="${subject}" — body withheld from logs`);
    return;
  }
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
