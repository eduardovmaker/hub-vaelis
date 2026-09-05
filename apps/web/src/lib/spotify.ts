import { db, COLLECTIONS } from "./db";
import { readEnv } from "./env";
import type { SpotifyAccount } from "./types";

/**
 * Integração com o Spotify.
 *
 * A tela roda o Web Playback SDK e se registra como um dispositivo Spotify.
 * O refresh token fica somente no Firestore: a tela recebe apenas access
 * tokens de curta duração, e o painel controla a reprodução pela Web API
 * apontando para o device_id daquela tela.
 */

/** Escopos mínimos: `streaming` é o que habilita o Web Playback SDK. */
export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

/** Cookie com o nonce que amarra o callback do OAuth a esta aplicação. */
export const SPOTIFY_STATE_COOKIE = "vaelis_spotify_state";

const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getSpotifyCredentials(): SpotifyCredentials | null {
  const clientId = readEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = readEnv("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const appUrl = readEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
  const redirectUri =
    readEnv("SPOTIFY_REDIRECT_URI") || `${appUrl}/api/auth/spotify/callback`;

  return { clientId, clientSecret, redirectUri };
}

function basicAuthHeader({ clientId, clientSecret }: SpotifyCredentials): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildAuthorizeUrl(credentials: SpotifyCredentials, state: string): string {
  const url = new URL(`${SPOTIFY_ACCOUNTS_URL}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("redirect_uri", credentials.redirectUri);
  url.searchParams.set("state", state);
  // Garante que o estabelecimento possa escolher a conta correta do negócio.
  url.searchParams.set("show_dialog", "true");
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(
  credentials: SpotifyCredentials,
  code: string
): Promise<TokenResponse> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(credentials),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: credentials.redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify recusou a troca do codigo: ${await res.text()}`);
  }
  return res.json();
}

async function refreshTokens(
  credentials: SpotifyCredentials,
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(credentials),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao renovar o token do Spotify: ${await res.text()}`);
  }
  return res.json();
}

export async function getSpotifyAccount(tenantId: string): Promise<SpotifyAccount | null> {
  if (!db) return null;
  const doc = await db.collection(COLLECTIONS.SPOTIFY_ACCOUNTS).doc(tenantId).get();
  if (!doc.exists) return null;
  return doc.data() as SpotifyAccount;
}

export async function fetchSpotifyProfile(accessToken: string) {
  const res = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ display_name?: string; email?: string; product?: string }>;
}

/**
 * Devolve um access token válido para o estabelecimento, renovando quando
 * faltar menos de um minuto para expirar e persistindo o novo token.
 */
export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  const credentials = getSpotifyCredentials();
  if (!credentials || !db) return null;

  const account = await getSpotifyAccount(tenantId);
  if (!account?.connected || !account.refreshToken) return null;

  const expiresAt = new Date(account.expiresAt || 0).getTime();
  if (account.accessToken && expiresAt - Date.now() > 60_000) {
    return account.accessToken;
  }

  const tokens = await refreshTokens(credentials, account.refreshToken);
  const updated = {
    accessToken: tokens.access_token,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    // O Spotify pode rotacionar o refresh token; se vier um novo, ele substitui.
    ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
    updatedAt: new Date().toISOString(),
  };
  await db.collection(COLLECTIONS.SPOTIFY_ACCOUNTS).doc(tenantId).set(updated, { merge: true });

  return tokens.access_token;
}

async function spotifyRequest(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${SPOTIFY_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  // Comandos de playback respondem 204 sem corpo.
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { ok: res.ok, status: res.status, body };
}

export async function listUserPlaylists(accessToken: string) {
  const result = await spotifyRequest(accessToken, "/me/playlists?limit=50");
  if (!result.ok) return [];
  const items = (result.body as { items?: unknown[] })?.items || [];
  return items.map((raw) => {
    const item = raw as {
      uri: string;
      name: string;
      images?: { url: string }[];
      tracks?: { total: number };
      owner?: { display_name?: string };
    };
    return {
      uri: item.uri,
      name: item.name,
      imageUrl: item.images?.[0]?.url || "",
      trackCount: item.tracks?.total || 0,
      owner: item.owner?.display_name || "",
    };
  });
}

export type PlaybackAction = "play" | "pause" | "next" | "previous" | "volume";

export interface PlaybackCommand {
  action: PlaybackAction;
  deviceId: string;
  contextUri?: string;
  volumePercent?: number;
  shuffle?: boolean;
}

/**
 * Move a reprodução para o dispositivo da tela e executa o comando.
 * `play` sem contextUri retoma de onde parou.
 */
export async function sendPlaybackCommand(
  accessToken: string,
  command: PlaybackCommand
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const device = encodeURIComponent(command.deviceId);

  switch (command.action) {
    case "play": {
      if (command.shuffle !== undefined) {
        await spotifyRequest(
          accessToken,
          `/me/player/shuffle?state=${command.shuffle}&device_id=${device}`,
          { method: "PUT" }
        );
      }
      return spotifyRequest(accessToken, `/me/player/play?device_id=${device}`, {
        method: "PUT",
        body: JSON.stringify(command.contextUri ? { context_uri: command.contextUri } : {}),
      });
    }
    case "pause":
      return spotifyRequest(accessToken, `/me/player/pause?device_id=${device}`, {
        method: "PUT",
      });
    case "next":
      return spotifyRequest(accessToken, `/me/player/next?device_id=${device}`, {
        method: "POST",
      });
    case "previous":
      return spotifyRequest(accessToken, `/me/player/previous?device_id=${device}`, {
        method: "POST",
      });
    case "volume": {
      const volume = Math.max(0, Math.min(100, Math.round(command.volumePercent ?? 50)));
      return spotifyRequest(
        accessToken,
        `/me/player/volume?volume_percent=${volume}&device_id=${device}`,
        { method: "PUT" }
      );
    }
  }
}

export async function getPlaybackState(accessToken: string) {
  const result = await spotifyRequest(accessToken, "/me/player");
  if (!result.ok || !result.body) return null;
  const state = result.body as {
    is_playing?: boolean;
    device?: { id?: string; name?: string; volume_percent?: number };
    item?: { name?: string; artists?: { name: string }[]; album?: { images?: { url: string }[] } };
  };
  return {
    isPlaying: !!state.is_playing,
    deviceId: state.device?.id || "",
    deviceName: state.device?.name || "",
    volumePercent: state.device?.volume_percent ?? 0,
    trackName: state.item?.name || "",
    artistName: (state.item?.artists || []).map((a) => a.name).join(", "),
    albumArtUrl: state.item?.album?.images?.[0]?.url || "",
  };
}

/**
 * Aceita link compartilhado, URI nativa ou ID cru e devolve um context URI
 * (`spotify:playlist:...`) aceito pela Web API.
 */
export function parseSpotifyContextUri(input: string): string {
  const value = (input || "").trim();
  if (!value) return "";

  if (value.startsWith("spotify:")) {
    const [, type, id] = value.split(":");
    return type && id ? `spotify:${type}:${id.split("?")[0]}` : "";
  }

  try {
    const url = new URL(value);
    if (!url.hostname.endsWith("spotify.com")) return "";
    // Remove prefixos regionais como /intl-pt/.
    const path = url.pathname.replace(/^\/intl-[a-z]{2}(-[a-zA-Z]{2,4})?/, "");
    const segments = path.split("/").filter(Boolean);
    // O embed usa /embed/playlist/<id>.
    const relevant = segments[0] === "embed" ? segments.slice(1) : segments;
    const [type, id] = relevant;
    if (!type || !id) return "";
    if (!["playlist", "album", "artist", "show"].includes(type)) return "";
    return `spotify:${type}:${id}`;
  } catch {
    // ID cru de playlist (22 caracteres base62).
    if (/^[A-Za-z0-9]{22}$/.test(value)) return `spotify:playlist:${value}`;
    return "";
  }
}
