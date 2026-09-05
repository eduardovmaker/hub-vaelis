import { NextResponse } from "next/server";
import { db, COLLECTIONS, withDbTimeout } from "@/lib/db";
import { authRatelimit, checkRateLimit } from "@/lib/ratelimit";
import { buildPasswordResetEmail, getMailProvider, sendEmail } from "@/lib/mailer";
import { RESET_TOKEN_TTL_MINUTES, createPasswordResetToken } from "@/lib/passwordReset";
import { readEnv } from "@/lib/env";

/**
 * Pedido de redefinição de senha.
 *
 * A resposta é sempre a mesma, exista ou não uma conta com aquele e-mail:
 * responder diferente transformaria esta rota em um verificador de quais
 * e-mails têm cadastro na plataforma.
 */
export async function POST(request: Request) {
  const respostaGenerica = NextResponse.json({
    success: true,
    message:
      "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também a caixa de spam.",
  });

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rl = await checkRateLimit(authRatelimit, `forgot_${ip}`);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Muitas tentativas. Aguarde 1 minuto e tente novamente." },
        { status: 429 }
      );
    }

    const { email } = await request.json().catch(() => ({}));
    const normalizado = String(email || "").toLowerCase().trim();
    if (!normalizado || !db) return respostaGenerica;

    const snapshot = await withDbTimeout(
      db.collection(COLLECTIONS.USERS).where("email", "==", normalizado).limit(1).get()
    );
    if (snapshot.empty) return respostaGenerica;

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    const token = await createPasswordResetToken({ userId: userDoc.id, email: normalizado });
    if (!token) return respostaGenerica;

    const appUrl = (readEnv("NEXT_PUBLIC_APP_URL") || new URL(request.url).origin).replace(/\/$/, "");
    const resetUrl = `${appUrl}/redefinir-senha?token=${token}`;

    const conteudo = buildPasswordResetEmail({
      name: userData.name || "tudo bem",
      resetUrl,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });

    const envio = await sendEmail({ to: normalizado, ...conteudo });

    if (!envio.delivered) {
      console.error("[forgot-password] E-mail não entregue:", envio.provider, envio.error);

      // Em desenvolvimento sem provedor de e-mail, devolve o link para que o
      // fluxo possa ser testado. Nunca em produção.
      if (process.env.NODE_ENV !== "production" && getMailProvider() === "console") {
        return NextResponse.json({
          success: true,
          message:
            "Nenhum provedor de e-mail configurado. Em desenvolvimento, use o link abaixo para continuar.",
          devResetUrl: resetUrl,
        });
      }
    }

    return respostaGenerica;
  } catch (error) {
    console.error("Erro em /api/auth/forgot-password:", error);
    // Mesmo em falha interna a resposta não revela nada sobre o e-mail.
    return respostaGenerica;
  }
}
