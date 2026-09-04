import { NextResponse } from "next/server";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { requireTenantAccess } from "@/lib/session";
import {
  getPlaybackState,
  getSpotifyAccount,
  getValidAccessToken,
  sendPlaybackCommand,
  type PlaybackAction,
} from "@/lib/spotify";
import { getScreen } from "@/lib/screens";

type Params = { params: Promise<{ tenantId: string }> };

const VALID_ACTIONS: PlaybackAction[] = ["play", "pause", "next", "previous", "volume"];

/** Estado atual da reprodução, para o painel mostrar a faixa que está no ar. */
export async function GET(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  try {
    const accessToken = await getValidAccessToken(tenantId);
    if (!accessToken) {
      return NextResponse.json({ success: true, connected: false, playback: null });
    }
    return NextResponse.json({
      success: true,
      connected: true,
      playback: await getPlaybackState(accessToken),
    });
  } catch (error) {
    console.error("Erro ao consultar playback do Spotify:", error);
    return NextResponse.json({ success: true, connected: false, playback: null });
  }
}

/**
 * Executa um comando de reprodução na tela escolhida.
 *
 * O alvo é o device_id que o Web Playback SDK daquela tela reportou; sem ele
 * o Spotify não sabe em qual aparelho tocar.
 */
export async function POST(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = body.action as PlaybackAction;
  const screenId = String(body.screenId || "");

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { success: false, error: "Comando inválido." },
      { status: 400 }
    );
  }

  const screen = await getScreen(screenId);
  if (!screen || screen.tenantId !== tenantId) {
    return NextResponse.json(
      { success: false, error: "Tela não encontrada neste estabelecimento." },
      { status: 404 }
    );
  }

  if (!screen.spotifyDeviceId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "A tela ainda não se registrou como dispositivo Spotify. Abra o player na TV e toque em Iniciar.",
      },
      { status: 409 }
    );
  }

  const account = await getSpotifyAccount(tenantId);
  if (!account?.connected) {
    return NextResponse.json(
      { success: false, error: "Conecte uma conta Spotify antes de controlar a música." },
      { status: 409 }
    );
  }

  try {
    const accessToken = await getValidAccessToken(tenantId);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Autorização do Spotify expirada. Reconecte a conta." },
        { status: 409 }
      );
    }

    const volumePercent =
      action === "volume" ? Math.max(0, Math.min(100, Number(body.volumePercent) || 0)) : undefined;

    const result = await sendPlaybackCommand(accessToken, {
      action,
      deviceId: screen.spotifyDeviceId,
      contextUri: action === "play" ? account.contextUri : undefined,
      shuffle: action === "play" ? account.shuffle !== false : undefined,
      volumePercent,
    });

    if (!result.ok) {
      // 403 costuma ser conta sem Premium; 404 é dispositivo que saiu do ar.
      const message =
        result.status === 403
          ? "O Spotify recusou o comando. A conta precisa ser Premium para tocar na tela."
          : result.status === 404
            ? "A tela não está mais disponível como dispositivo Spotify. Recarregue o player."
            : "O Spotify recusou o comando de reprodução.";
      return NextResponse.json({ success: false, error: message }, { status: 502 });
    }

    // Guarda o volume escolhido para a tela reaplicar quando reiniciar.
    if (action === "volume" && db && volumePercent !== undefined) {
      await db
        .collection(COLLECTIONS.SCREENS)
        .doc(screenId)
        .set(sanitizeForFirestore({ volumePercent, updatedAt: new Date().toISOString() }), {
          merge: true,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar comando ao Spotify:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao comunicar com o Spotify." },
      { status: 502 }
    );
  }
}
