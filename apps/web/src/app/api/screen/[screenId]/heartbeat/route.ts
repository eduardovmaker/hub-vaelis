import { NextResponse } from "next/server";
import { authenticateScreen, touchScreen } from "@/lib/screens";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ screenId: string }> };

/**
 * Presença da tela. O player chama periodicamente e informa o device_id do
 * Web Playback SDK, que é o alvo dos comandos de música enviados pelo painel.
 */
export async function POST(request: Request, { params }: Params) {
  const { screenId } = await params;

  const auth = await authenticateScreen(screenId, request);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const spotifyDeviceId = body.spotifyDeviceId ? String(body.spotifyDeviceId) : undefined;

  await touchScreen(screenId, spotifyDeviceId ? { spotifyDeviceId } : {});

  return NextResponse.json({ success: true });
}
