import { NextResponse } from "next/server";
import { authenticateScreen, loadScreenBootstrap, touchScreen } from "@/lib/screens";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ screenId: string }> };

/**
 * Configuração completa que a tela busca ao abrir e a cada ciclo de sincronia:
 * playlist de mídia do R2, marca do estabelecimento, overlays e trilha sonora.
 */
export async function GET(request: Request, { params }: Params) {
  const { screenId } = await params;

  const auth = await authenticateScreen(screenId, request);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const bootstrap = await loadScreenBootstrap(auth.screen);

  // A própria busca de configuração já serve como sinal de presença.
  await touchScreen(screenId).catch(() => {});

  return NextResponse.json(
    { success: true, ...bootstrap },
    { headers: { "Cache-Control": "no-store" } }
  );
}
