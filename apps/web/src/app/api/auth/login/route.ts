import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, COLLECTIONS, withDbTimeout } from "@/lib/db";
import { authRatelimit, checkRateLimit } from "@/lib/ratelimit";
import { attachSessionCookie } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rl = await checkRateLimit(authRatelimit, `login_${ip}`);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Muitas tentativas de login. Aguarde 1 minuto e tente novamente." },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: "Banco de dados indisponível. Verifique as credenciais do Firebase." },
        { status: 503 }
      );
    }

    const snapshot = await withDbTimeout(
      db
        .collection(COLLECTIONS.USERS)
        .where("email", "==", String(email).toLowerCase().trim())
        .limit(1)
        .get()
    );

    const invalidCredentials = NextResponse.json(
      { success: false, error: "Credenciais inválidas. Verifique o e-mail e a senha." },
      { status: 401 }
    );

    if (snapshot.empty) return invalidCredentials;

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    if (!userData?.passwordHash) return invalidCredentials;

    const passwordMatches = await bcrypt.compare(password, userData.passwordHash);
    if (!passwordMatches) return invalidCredentials;

    const user: SessionUser = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      tenantId: userData.tenantId || undefined,
      tenantName: userData.tenantName || undefined,
    };

    return attachSessionCookie(NextResponse.json({ success: true, user }), user);
  } catch (error) {
    console.error("Erro na rota /api/auth/login:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao autenticar." },
      { status: 500 }
    );
  }
}
