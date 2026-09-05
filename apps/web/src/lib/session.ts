import crypto from "crypto";
import { NextResponse } from "next/server";
import { loadEnvFile, readEnv } from "./env";
import type { SessionUser } from "./types";

/**
 * Sessão do painel em cookie httpOnly assinado com HMAC.
 *
 * O front guarda o usuário só para desenhar a interface; a autorização real
 * das rotas vem sempre deste cookie, que o navegador não consegue forjar.
 */

loadEnvFile();

export const SESSION_COOKIE = "vaelis_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getSecret(): string {
  const secret = readEnv("AUTH_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET ausente ou curta. Defina no .env uma chave aleatória de 32+ caracteres."
    );
  }
  return secret;
}

interface SessionPayload extends SessionUser {
  /** Epoch em segundos do vencimento da sessão. */
  exp: number;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;

    const { exp: _exp, ...user } = payload;
    return user;
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function getSessionUser(request: Request): SessionUser | null {
  try {
    return verifySessionToken(readCookie(request, SESSION_COOKIE));
  } catch {
    // AUTH_SECRET ausente: trata como não autenticado em vez de estourar 500.
    return null;
  }
}

export function attachSessionCookie(response: NextResponse, user: SessionUser): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: createSessionToken(user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function unauthorized(message = "Sessão expirada. Faça login novamente.") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = "Você não tem acesso a este estabelecimento.") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/** Só o super admin da plataforma passa. */
export function requireSuperAdmin(
  request: Request
): { user: SessionUser } | { response: NextResponse } {
  const user = getSessionUser(request);
  if (!user) return { response: unauthorized() };
  if (user.role !== "SUPER_ADMIN") return { response: forbidden("Acesso restrito ao administrador da plataforma.") };
  return { user };
}

/** Passa o super admin ou o administrador do próprio estabelecimento. */
export function requireTenantAccess(
  request: Request,
  tenantId: string
): { user: SessionUser } | { response: NextResponse } {
  const user = getSessionUser(request);
  if (!user) return { response: unauthorized() };
  if (user.role === "SUPER_ADMIN") return { user };
  if (user.tenantId && user.tenantId === tenantId) return { user };
  return { response: forbidden() };
}
