import { NextResponse } from "next/server";
import { authenticateScreen } from "@/lib/screens";
import { getValidAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ screenId: string }> };

/**
 * Access token de curta duração para o Web Playback SDK da tela.
 *
 * O SDK pede um token novo sempre que o atual expira; o refresh token fica
 * no servidor e nunca chega ao navegador da TV.
 */
export async function GET(request: Request, { params }: Params) {
  const { screenId } = await params;

  const auth = await authenticateScreen(screenId, request);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (auth.screen.musicEnabled === false) {
    return NextResponse.json(
      { success: false, error: "Música desativada nesta tela." },
      { status: 409 }
    );
  }

  try {
    const accessToken = await getValidAccessToken(auth.screen.tenantId);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Nenhuma conta Spotify conectada para este estabelecimento." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: true, accessToken },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erro ao obter token do Spotify para a tela:", error);
    return NextResponse.json(
      { success: false, error: "Autorização do Spotify expirada. Reconecte a conta no painel." },
      { status: 409 }
    );
  }
}
