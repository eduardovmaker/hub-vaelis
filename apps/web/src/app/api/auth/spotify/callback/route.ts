import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawTenantId = searchParams.get("state") || "default";

  // Sanitização estrita contra Path Traversal e Open Redirect
  const cleanTenantId = rawTenantId.replace(/[^\w-]/g, "") || "default";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/tenant/${encodeURIComponent(cleanTenantId)}?error=spotify_auth_denied`, request.url)
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/spotify/callback`;

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      
      // Buscar dados do usuário no Spotify
      const userRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = userRes.ok ? await userRes.json() : null;

      // Salvar conexão no Firestore no documento de radioIndoorConfigs do tenant
      if (db) {
        await db.collection(COLLECTIONS.RADIO_INDOOR_CONFIGS).doc(cleanTenantId).set(
          {
            tenantId: cleanTenantId,
            spotifyConnected: true,
            spotifyUser: userData?.display_name || userData?.email || "Conta Spotify Premium",
            spotifyAccessToken: tokenData.access_token,
            spotifyRefreshToken: tokenData.refresh_token,
            spotifyTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return NextResponse.redirect(
        new URL(`/tenant/${encodeURIComponent(cleanTenantId)}?spotify_connected=true`, request.url)
      );
    }
  } catch (err) {
    console.error("Erro no callback do Spotify:", err);
  }

  return NextResponse.redirect(
    new URL(`/tenant/${encodeURIComponent(cleanTenantId)}?error=spotify_token_failed`, request.url)
  );
}
