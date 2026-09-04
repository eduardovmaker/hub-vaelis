import { NextResponse } from "next/server";
import crypto from "crypto";
import { SPOTIFY_STATE_COOKIE, buildAuthorizeUrl, getSpotifyCredentials } from "@/lib/spotify";
import { requireTenantAccess } from "@/lib/session";

/**
 * Inicia o OAuth do Spotify para um estabelecimento.
 * O state carrega o tenantId e um nonce que volta no callback, e o nonce fica
 * em cookie para que um callback forjado de outra origem não seja aceito.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = (searchParams.get("tenantId") || "").replace(/[^\w-]/g, "");

  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: "Informe o tenantId do estabelecimento." },
      { status: 400 }
    );
  }

  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  const credentials = getSpotifyCredentials();
  if (!credentials) {
    return NextResponse.redirect(
      new URL(`/tenant/${tenantId}?tab=musica&error=spotify_credentials_missing`, request.url)
    );
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${tenantId}:${nonce}`;

  const response = NextResponse.redirect(buildAuthorizeUrl(credentials, state));
  response.cookies.set({
    name: SPOTIFY_STATE_COOKIE,
    value: nonce,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
