import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { requireTenantAccess } from "@/lib/session";
import {
  getSpotifyAccount,
  getValidAccessToken,
  listUserPlaylists,
  parseSpotifyContextUri,
} from "@/lib/spotify";

type Params = { params: Promise<{ tenantId: string }> };

/** Estado da conexão com o Spotify e playlists disponíveis na conta. */
export async function GET(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  const account = await getSpotifyAccount(tenantId);
  if (!account?.connected) {
    return NextResponse.json({
      success: true,
      connected: false,
      needsPremium: false,
      playlists: [],
    });
  }

  let playlists: Awaited<ReturnType<typeof listUserPlaylists>> = [];
  let tokenError: string | null = null;
  try {
    const accessToken = await getValidAccessToken(tenantId);
    if (accessToken) playlists = await listUserPlaylists(accessToken);
  } catch (error) {
    // Refresh token revogado no app do Spotify: o painel precisa pedir reconexão.
    tokenError = "A autorização do Spotify expirou. Reconecte a conta.";
    console.error("Erro ao renovar token do Spotify:", error);
  }

  return NextResponse.json({
    success: true,
    connected: true,
    displayName: account.displayName,
    product: account.product,
    needsPremium: account.product !== "premium",
    contextUri: account.contextUri || "",
    playlistName: account.playlistName || "",
    shuffle: account.shuffle !== false,
    playlists,
    tokenError,
  });
}

/** Escolhe a playlist da rádio, alterna o shuffle ou desconecta a conta. */
export async function POST(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json(
      { success: false, error: "Banco de dados indisponível." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const docRef = db.collection(COLLECTIONS.SPOTIFY_ACCOUNTS).doc(tenantId);

  if (action === "disconnect") {
    // Apaga os tokens: nada de credencial órfã guardada no banco.
    await docRef.set(
      {
        connected: false,
        displayName: "",
        product: "unknown",
        accessToken: "",
        refreshToken: "",
        expiresAt: new Date(0).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return NextResponse.json({ success: true, connected: false, message: "Spotify desconectado." });
  }

  if (action === "set-playlist") {
    const contextUri = parseSpotifyContextUri(String(body.contextUri || body.playlistUrl || ""));
    if (!contextUri) {
      return NextResponse.json(
        {
          success: false,
          error: "Link do Spotify não reconhecido. Cole o link de uma playlist, álbum ou artista.",
        },
        { status: 400 }
      );
    }

    await docRef.set(
      {
        contextUri,
        playlistName: String(body.playlistName || "").slice(0, 120) || "Playlist do Spotify",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return NextResponse.json({ success: true, contextUri, message: "Playlist da rádio atualizada." });
  }

  if (action === "set-shuffle") {
    await docRef.set(
      { shuffle: !!body.shuffle, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return NextResponse.json({ success: true, shuffle: !!body.shuffle });
  }

  return NextResponse.json(
    { success: false, error: "Ação inválida." },
    { status: 400 }
  );
}
