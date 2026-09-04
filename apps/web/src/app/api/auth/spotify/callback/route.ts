import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, COLLECTIONS } from "@/lib/db";
import {
  exchangeCodeForTokens,
  fetchSpotifyProfile,
  getSpotifyCredentials,
} from "@/lib/spotify";
import { SPOTIFY_STATE_COOKIE } from "../login/route";

/** Playlist inicial só para a tela não ficar em silêncio antes da escolha. */
const FALLBACK_CONTEXT_URI = "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M";

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function redirectToPanel(request: Request, tenantId: string, query: string) {
  const target = tenantId ? `/tenant/${encodeURIComponent(tenantId)}` : "/login";
  return NextResponse.redirect(new URL(`${target}?tab=musica&${query}`, request.url));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const [rawTenantId = "", nonce = ""] = (searchParams.get("state") || "").split(":");
  const tenantId = rawTenantId.replace(/[^\w-]/g, "");

  // O nonce em cookie garante que o fluxo começou nesta aplicação.
  const expectedNonce = readCookie(request, SPOTIFY_STATE_COOKIE);
  const nonceMatches =
    !!nonce &&
    !!expectedNonce &&
    nonce.length === expectedNonce.length &&
    crypto.timingSafeEqual(Buffer.from(nonce), Buffer.from(expectedNonce));

  if (!nonceMatches) {
    return redirectToPanel(request, tenantId, "error=spotify_state_invalido");
  }

  if (!code) {
    return redirectToPanel(request, tenantId, "error=spotify_autorizacao_negada");
  }

  const credentials = getSpotifyCredentials();
  if (!credentials || !db) {
    return redirectToPanel(request, tenantId, "error=spotify_credentials_missing");
  }

  try {
    const tokens = await exchangeCodeForTokens(credentials, code);
    const profile = await fetchSpotifyProfile(tokens.access_token);

    const existing = await db.collection(COLLECTIONS.SPOTIFY_ACCOUNTS).doc(tenantId).get();
    const previous = existing.exists ? existing.data() : null;

    await db.collection(COLLECTIONS.SPOTIFY_ACCOUNTS).doc(tenantId).set(
      {
        tenantId,
        connected: true,
        displayName: profile?.display_name || profile?.email || "Conta Spotify",
        product: profile?.product || "unknown",
        accessToken: tokens.access_token,
        // Numa reautorização o Spotify pode omitir o refresh token: preserva o antigo.
        refreshToken: tokens.refresh_token || previous?.refreshToken || "",
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        contextUri: previous?.contextUri || FALLBACK_CONTEXT_URI,
        playlistName: previous?.playlistName || "Playlist sugerida",
        shuffle: previous?.shuffle ?? true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Sem Premium o Web Playback SDK não toca faixa completa: avisa no painel.
    const query =
      profile?.product === "premium"
        ? "spotify=conectado"
        : "spotify=conectado&aviso=sem_premium";

    const response = redirectToPanel(request, tenantId, query);
    response.cookies.set({ name: SPOTIFY_STATE_COOKIE, value: "", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Erro no callback do Spotify:", error);
    return redirectToPanel(request, tenantId, "error=spotify_token_failed");
  }
}
