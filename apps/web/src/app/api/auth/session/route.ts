import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionUser } from "@/lib/session";

/** Confirma se o cookie de sessão ainda é válido (usado ao abrir o painel). */
export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ success: true, user });
}

/** Logout: descarta o cookie de sessão. */
export async function DELETE() {
  return clearSessionCookie(NextResponse.json({ success: true }));
}
