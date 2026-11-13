/**
 * Email adapter
 * - Default transport: "log" (writes intent to console + data/email-log.jsonl)
 * - Optional "smtp" via environment variables only (never hard-code secrets)
 *
 * The static client never sends mail and never holds SMTP credentials.
 */
const fs = require("fs");
const path = require("path");

function EmailService(options) {
  this.transport = (options.transport || "log").toLowerCase();
  this.defaultTo = options.defaultTo || "";
  this.dataDir = options.dataDir || "./data";
  this.logPath = path.join(this.dataDir, "email-log.jsonl");
  if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
}

EmailService.prototype.sendReportPdf = async function ({ to, subject, text, pdfBuffer, recordId }) {
  const payload = {
    at: new Date().toISOString(),
    to: to || this.defaultTo,
    subject,
    recordId,
    transport: this.transport,
    pdfBytes: pdfBuffer ? pdfBuffer.length : 0,
  };

  if (this.transport === "smtp") {
    return this._sendSmtp(payload, text, pdfBuffer);
  }

  // Safe default: log only
  fs.appendFileSync(this.logPath, JSON.stringify(payload) + "\n");
  console.log("[email:log]", JSON.stringify(payload));
  return {
    ok: true,
    mode: "log",
    message:
      "Email logged (EMAIL_TRANSPORT=log). Configure SMTP via environment to send real mail.",
    to: payload.to,
  };
};

EmailService.prototype._sendSmtp = async function (payload, text, pdfBuffer) {
  // Lazy require so log mode works without nodemailer installed
  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (e) {
    throw new Error(
      "EMAIL_TRANSPORT=smtp requires the nodemailer package. Run: npm install nodemailer"
    );
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !from) {
    throw new Error("SMTP_HOST and SMTP_FROM (or SMTP_USER) are required for smtp transport");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: user ? { user, pass } : undefined,
  });

  const info = await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: text || "Store walk report attached.",
    attachments: pdfBuffer
      ? [{ filename: (payload.recordId || "report") + ".pdf", content: pdfBuffer }]
      : [],
  });

  fs.appendFileSync(
    this.logPath,
    JSON.stringify(Object.assign({}, payload, { messageId: info.messageId, mode: "smtp" })) + "\n"
  );

  return { ok: true, mode: "smtp", messageId: info.messageId, to: payload.to };
};

module.exports = EmailService;
