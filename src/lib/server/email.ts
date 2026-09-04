import { logger } from "./logger";
import { optEnv } from "./env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  id: string;
  send(msg: EmailMessage): Promise<void>;
}

/** Development default: prints emails to the server log. */
export class ConsoleEmailProvider implements EmailProvider {
  id = "console";
  async send(msg: EmailMessage): Promise<void> {
    logger.info("email.outbound", { to: msg.to, subject: msg.subject, text: msg.text });
  }
}

/** SMTP provider used when EMAIL_PROVIDER=smtp. */
export class SmtpEmailProvider implements EmailProvider {
  id = "smtp";
  private nodemailer: any = null;
  private host = optEnv("SMTP_HOST") ?? "";
  private port = Number(optEnv("SMTP_PORT") ?? 587);
  private user = optEnv("SMTP_USER") ?? "";
  private pass = optEnv("SMTP_PASS") ?? "";
  private from = optEnv("EMAIL_FROM") ?? "WebForge AI <no-reply@webforge.app>";

  private async transport() {
    if (!this.nodemailer) {
      // Imported lazily so build environments without credentials stay clean.
      const nm = await import("nodemailer");
      this.nodemailer = nm.default.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: this.user ? { user: this.user, pass: this.pass } : undefined,
      });
    }
    return this.nodemailer;
  }

  async send(msg: EmailMessage): Promise<void> {
    const t = await this.transport();
    await t.sendMail({ from: this.from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    provider = optEnv("EMAIL_PROVIDER") === "smtp" ? new SmtpEmailProvider() : new ConsoleEmailProvider();
  }
  return provider;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  await getEmailProvider().send(msg);
}

/** Renders minimal HTML for transactional emails. */
export function emailHtml(title: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  return `<!doctype html><html><body style="background:#0b0b0d;color:#e4e4e7;font-family:Inter,Arial,sans-serif;padding:32px">
  <div style="max-width:520px;margin:auto;background:#101013;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:32px">
  <div style="font-size:18px;font-weight:700;letter-spacing:-.02em">WebForge <span style="color:#dc143c">AI</span></div>
  <h2 style="margin:20px 0 8px">${title}</h2>
  <div style="color:#a1a1aa;line-height:1.6;font-size:14px">${bodyHtml}</div>
  ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:22px;padding:12px 22px;border-radius:12px;background:linear-gradient(135deg,#f43f5e,#dc143c);color:#fff;text-decoration:none;font-weight:600">${cta.label}</a>` : ""}
  <p style="margin-top:28px;font-size:11px;color:#52525b">If you didn't request this email you can safely ignore it.</p>
  </div></body></html>`;
}
