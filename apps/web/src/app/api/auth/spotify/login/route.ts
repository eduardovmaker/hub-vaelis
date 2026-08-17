import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTenantId = searchParams.get("tenantId") || "default";
  
  // Sanitização estrita contra Path Traversal e Open Redirect
  const cleanTenantId = rawTenantId.replace(/[^\w-]/g, "") || "default";

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/spotify/callback`;

  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/tenant/${encodeURIComponent(cleanTenantId)}?error=spotify_credentials_missing`, request.url)
    );
  }

  const scope = "user-read-private user-read-email playlist-read-private user-read-playback-state user-modify-playback-state";
  const state = cleanTenantId;

  const spotifyAuthUrl = new URL("https://accounts.spotify.com/authorize");
  spotifyAuthUrl.searchParams.append("response_type", "code");
  spotifyAuthUrl.searchParams.append("client_id", clientId);
  spotifyAuthUrl.searchParams.append("scope", scope);
  spotifyAuthUrl.searchParams.append("redirect_uri", redirectUri);
  spotifyAuthUrl.searchParams.append("state", state);

  return NextResponse.redirect(spotifyAuthUrl.toString());
}
