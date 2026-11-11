import { describe, expect, mock, test } from "bun:test";
import type { Transporter } from "nodemailer";
import { SmtpMailDriver } from "./smtp.js";

const message = {
  to: "info@namehostclub.com",
  subject: "Test Subject",
  html: "<p>Hello World</p>",
  text: "Hello World",
};

describe("SmtpMailDriver", () => {
  test("successfully delivers an email via transporter", async () => {
    const sendMailMock = mock(async (_mailOptions: unknown) => ({
      messageId: "<test-smtp-message-id@yandex.com>",
    }));

    const driver = new SmtpMailDriver({
      host: "smtp.yandex.com",
      port: 465,
      secure: true,
      user: "hello@ayyansystems.com",
      password: "test-app-password",
      from: '"WATeamInbox" <hello@ayyansystems.com>',
      transporter: { sendMail: sendMailMock } as unknown as Transporter,
    });

    const result = await driver.send(message);

    expect(result).toEqual({
      success: true,
      messageId: "<test-smtp-message-id@yandex.com>",
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0]).toMatchObject({
      from: '"WATeamInbox" <hello@ayyansystems.com>',
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  });

  test("handles transporter sendMail errors gracefully", async () => {
    const sendMailMock = mock(async () => {
      throw new Error("Invalid login: 535 5.7.8 Error: authentication failed");
    });

    const driver = new SmtpMailDriver({
      host: "smtp.yandex.com",
      port: 465,
      from: "hello@ayyansystems.com",
      transporter: { sendMail: sendMailMock } as unknown as Transporter,
    });

    const result = await driver.send(message);

    expect(result.success).toBe(false);
    expect(result.error).toContain("authentication failed");
  });

  test("fails fast if abort signal is already aborted", async () => {
    const sendMailMock = mock(async () => ({
      messageId: "<test-msg-id>",
    }));

    const driver = new SmtpMailDriver({
      host: "smtp.yandex.com",
      port: 465,
      from: "hello@ayyansystems.com",
      transporter: { sendMail: sendMailMock } as unknown as Transporter,
    });

    const controller = new AbortController();
    controller.abort();

    const result = await driver.send({
      ...message,
      signal: controller.signal,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("aborted");
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
