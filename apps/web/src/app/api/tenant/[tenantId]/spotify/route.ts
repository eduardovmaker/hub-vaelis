import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { parseSpotifyEmbedUrl } from "@/mocks/tv";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  try {
    if (db) {
      const doc = await db.collection(COLLECTIONS.RADIO_INDOOR_CONFIGS).doc(tenantId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        return NextResponse.json({
          success: true,
          connected: !!data.spotifyConnected,
          spotifyUser: data.spotifyUser || "",
          playlistUrl: data.playlistUrl || "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
          playlistName: data.playlistName || "Hits da Boêmia & Sertanejo",
          provider: data.provider || "spotify",
        });
      }
    }
  } catch (err) {}

  return NextResponse.json({
    success: true,
    connected: false,
    spotifyUser: "",
    playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    playlistName: "Hits da Boêmia & Sertanejo",
    provider: "spotify",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  try {
    const body = await request.json();
    const { action, playlistUrl, playlistName, provider } = body;

    if (action === "disconnect") {
      if (db) {
        await db.collection(COLLECTIONS.RADIO_INDOOR_CONFIGS).doc(tenantId).set(
          {
            spotifyConnected: false,
            spotifyUser: "",
            spotifyAccessToken: null,
            spotifyRefreshToken: null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      return NextResponse.json({ success: true, connected: false, message: "Conta do Spotify desconectada com sucesso." });
    }

    // Se ação for salvar playlist ou conectar manualmente
    const isSpotify = (provider || "").toLowerCase() === "spotify" || (playlistUrl || "").includes("spotify");
    const cleanProvider = isSpotify ? "spotify" : "youtube";
    const formattedEmbedUrl = isSpotify ? parseSpotifyEmbedUrl(playlistUrl) : playlistUrl;

    const updatedData = {
      tenantId,
      provider: cleanProvider,
      playlistUrl: playlistUrl || "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      playlistName: playlistName || (isSpotify ? "Playlist do Spotify" : "Playlist do YouTube"),
      embedUrl: formattedEmbedUrl,
      updatedAt: new Date().toISOString(),
    };

    if (db) {
      await db.collection(COLLECTIONS.RADIO_INDOOR_CONFIGS).doc(tenantId).set(updatedData, { merge: true });
      
      // Também sincroniza com TV Config
      await db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId).set(
        {
          radioIndoorConfig: updatedData,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      config: updatedData,
      message: "Configuração de Rádio Indoor atualizada com sucesso!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar Spotify." },
      { status: 500 }
    );
  }
}
