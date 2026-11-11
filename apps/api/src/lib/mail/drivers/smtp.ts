import nodemailer, { type Transporter } from "nodemailer";
import type { EmailOptions, EmailResult, MailDriver } from "../types.js";

export interface SmtpMailDriverOptions {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  password?: string;
  from: string;
  transporter?: Transporter;
}

/** Production transport backed by standard SMTP (e.g. Yandex, Postmark, AWS SES, Gmail). */
export class SmtpMailDriver implements MailDriver {
  readonly name = "smtp";
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(options: SmtpMailDriverOptions) {
    this.from = options.from;
    this.transporter =
      options.transporter ??
      nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure ?? options.port === 465,
        auth:
          options.user && options.password
            ? {
                user: options.user,
                pass: options.password,
              }
            : undefined,
      });
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    if (options.signal?.aborted) {
      return {
        success: false,
        error: "Email delivery aborted before sending",
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown SMTP error",
      };
    }
  }
}

