import { loadEnvFile } from "./env";

/**
 * Envio de e-mail transacional.
 *
 * Dois caminhos, escolhidos pelo que estiver configurado no ambiente:
 * `RESEND_API_KEY` usa a API da Resend; `SMTP_HOST` usa SMTP comum (Gmail,
 * Google Workspace, Zoho, o servidor da hospedagem). Sem nenhum dos dois, o
 * conteúdo é apenas registrado no console — útil em desenvolvimento.
 */

loadEnvFile();

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type MailProvider = "resend" | "smtp" | "console";

export interface SendResult {
  delivered: boolean;
  provider: MailProvider;
  error?: string;
}

function getSender(): string {
  // Precisa ser um remetente autorizado no domínio verificado do provedor.
  return process.env.EMAIL_FROM || "Vaelis Indoor <onboarding@resend.dev>";
}

export function getMailProvider(): MailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}

async function sendWithResend(message: EmailMessage): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getSender(),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!res.ok) {
    return { delivered: false, provider: "resend", error: await res.text() };
  }
  return { delivered: true, provider: "resend" };
}

async function sendWithSmtp(message: EmailMessage): Promise<SendResult> {
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT) || 587;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 é TLS implícito; 587 sobe para TLS via STARTTLS.
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });

  await transporter.sendMail({
    from: getSender(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  return { delivered: true, provider: "smtp" };
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const provider = getMailProvider();

  try {
    if (provider === "resend") return await sendWithResend(message);
    if (provider === "smtp") return await sendWithSmtp(message);

    console.warn(
      "[Mailer] Nenhum provedor configurado (RESEND_API_KEY ou SMTP_HOST).\n" +
        `  Para: ${message.to}\n  Assunto: ${message.subject}\n${message.text}`
    );
    return { delivered: false, provider: "console" };
  } catch (error) {
    console.error("[Mailer] Falha ao enviar e-mail:", error);
    return {
      delivered: false,
      provider,
      error: error instanceof Error ? error.message : "erro desconhecido",
    };
  }
}

/** E-mail de redefinição de senha, em texto e HTML. */
export function buildPasswordResetEmail(params: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Pick<EmailMessage, "subject" | "html" | "text"> {
  const { name, resetUrl, expiresInMinutes } = params;
  const subject = "Redefinir sua senha — Vaelis Indoor";

  const text = [
    `Olá, ${name}.`,
    "",
    "Recebemos um pedido para redefinir a senha do seu acesso ao Vaelis Indoor.",
    `Abra o link abaixo para criar uma nova senha. Ele vale por ${expiresInMinutes} minutos e só pode ser usado uma vez.`,
    "",
    resetUrl,
    "",
    "Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.",
  ].join("\n");

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f9fafb;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:1px;color:#2065d1;text-transform:uppercase">Vaelis Indoor</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#212b36">Redefinir sua senha</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#454f5b">Olá, ${name}. Recebemos um pedido para redefinir a senha do seu acesso.</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#454f5b">O link vale por ${expiresInMinutes} minutos e só pode ser usado uma vez.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#212b36;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px">Criar nova senha</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#637381">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="color:#2065d1;word-break:break-all">${resetUrl}</span></p>
    <hr style="border:none;border-top:1px solid rgba(145,158,171,.2);margin:24px 0">
    <p style="margin:0;font-size:13px;line-height:1.6;color:#637381">Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.</p>
  </div>
</div>`.trim();

  return { subject, html, text };
}
