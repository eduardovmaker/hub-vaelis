import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, COLLECTIONS } from "@/lib/db";
import { authRatelimit, checkRateLimit } from "@/lib/ratelimit";
import {
  MIN_PASSWORD_LENGTH,
  consumePasswordResetToken,
  inspectPasswordResetToken,
} from "@/lib/passwordReset";

/** Confere o token ao abrir a tela, para avisar antes de a pessoa digitar. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const check = await inspectPasswordResetToken(searchParams.get("token") || "");

  if (!check.valid) {
    return NextResponse.json({ success: false, error: check.reason }, { status: 400 });
  }
  return NextResponse.json({ success: true, email: check.email });
}

/** Grava a nova senha e queima o token. */
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rl = await checkRateLimit(authRatelimit, `reset_${ip}`);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Muitas tentativas. Aguarde 1 minuto e tente novamente." },
        { status: 429 }
      );
    }

    const { token, password } = await request.json().catch(() => ({}));

    if (String(password || "").length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    const check = await inspectPasswordResetToken(String(token || ""));
    if (!check.valid) {
      return NextResponse.json({ success: false, error: check.reason }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: "Banco de dados indisponível." },
        { status: 503 }
      );
    }

    await db
      .collection(COLLECTIONS.USERS)
      .doc(check.userId)
      .set(
        {
          passwordHash: await bcrypt.hash(String(password), 10),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    await consumePasswordResetToken(check.tokenHash, check.userId);

    return NextResponse.json({
      success: true,
      message: "Senha alterada. Você já pode entrar com a nova senha.",
    });
  } catch (error) {
    console.error("Erro em /api/auth/reset-password:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao redefinir a senha." },
      { status: 500 }
    );
  }
}
