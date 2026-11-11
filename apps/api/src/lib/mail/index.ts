import { env } from "../env.js";
import { CloudflareMailDriver } from "./drivers/cloudflare.js";
import { LogMailDriver } from "./drivers/log.js";
import { ResendMailDriver } from "./drivers/resend.js";
import { SmtpMailDriver } from "./drivers/smtp.js";
import type { EmailOptions, EmailResult, MailDriver } from "./types.js";

export type MailDriverName = "log" | "resend" | "cloudflare" | "smtp";

export function createMailDriver(name: string = env.MAIL_DRIVER): MailDriver {
  switch (name) {
    case "log":
      return new LogMailDriver();
    case "resend":
      return new ResendMailDriver({
        apiKey: env.RESEND_API_KEY,
        from: env.EMAIL_FROM,
      });
    case "cloudflare":
      return new CloudflareMailDriver({
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: env.CLOUDFLARE_EMAIL_API_TOKEN,
        from: env.EMAIL_FROM,
      });
    case "smtp":
      return new SmtpMailDriver({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.EMAIL_FROM,
      });
    default:
      throw new Error(
        `Unsupported MAIL_DRIVER "${name}". Expected one of: log, resend, cloudflare, smtp`,
      );
  }
}

let activeDriver: MailDriver | null = null;

export function getMailDriver(): MailDriver {
  activeDriver ??= createMailDriver();
  return activeDriver;
}

export async function deliverEmail(
  options: EmailOptions,
): Promise<EmailResult> {
  return getMailDriver().send(options);
}

export type { EmailOptions, EmailResult, MailDriver } from "./types.js";
