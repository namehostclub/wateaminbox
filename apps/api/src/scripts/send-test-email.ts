import { env } from "../lib/env.js";
import { deliverEmail } from "../lib/mail/index.js";

const recipient = process.argv[2] || "info@namehostclub.com";

console.log(`[send-test-email] Initializing test delivery...`);
console.log(`[send-test-email] Driver: ${env.MAIL_DRIVER}`);
console.log(`[send-test-email] From:   ${env.EMAIL_FROM}`);
console.log(`[send-test-email] To:     ${recipient}`);
if (env.MAIL_DRIVER === "smtp") {
  console.log(`[send-test-email] Host:   ${env.SMTP_HOST}:${env.SMTP_PORT} (secure=${env.SMTP_SECURE})`);
  console.log(`[send-test-email] User:   ${env.SMTP_USER}`);
}

const result = await deliverEmail({
  to: recipient,
  subject: "WATeamInbox SMTP Verification",
  text: "This is a test email from WATeamInbox confirming your SMTP settings on smtp.yandex.com are working properly.",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #075E54; margin-top: 0;">WATeamInbox SMTP Verification</h2>
      <p style="font-size: 15px; color: #333;">Hello,</p>
      <p style="font-size: 15px; color: #333; line-height: 1.5;">
        This email confirms that your SMTP integration on <strong>${env.SMTP_HOST || "smtp"}</strong> is fully functional and ready to send transactional verification links, password resets, and workspace invitations.
      </p>
      <div style="background-color: #f7f7f7; padding: 14px; border-radius: 6px; margin: 20px 0; font-size: 14px; color: #555;">
        <div><strong>Sender:</strong> ${env.EMAIL_FROM}</div>
        <div><strong>Recipient:</strong> ${recipient}</div>
        <div><strong>Server:</strong> ${env.SMTP_HOST}:${env.SMTP_PORT}</div>
        <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
      </div>
      <p style="color: #888; font-size: 12px; margin-bottom: 0;">Sent securely from the WATeamInbox production stack.</p>
    </div>
  `,
});

if (result.success) {
  console.log(`[send-test-email] SUCCESS! Email accepted by mail server.`);
  console.log(`[send-test-email] Message-ID: ${result.messageId}`);
  process.exit(0);
} else {
  console.error(`[send-test-email] FAILURE! Could not send email.`);
  console.error(`[send-test-email] Error: ${result.error}`);
  process.exit(1);
}
