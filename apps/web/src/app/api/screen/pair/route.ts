import { NextResponse } from "next/server";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { findScreenByPairingCode, loadScreenBootstrap } from "@/lib/screens";
import { checkRateLimit, pairingRatelimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Pareamento da TV.
 *
 * O player envia o código mostrado no painel e recebe de volta o id da tela e
 * o segredo do dispositivo, que fica guardado no navegador da TV e autentica
 * todas as chamadas seguintes.
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // O código tem 6 caracteres: sem limite de tentativas ele seria adivinhável.
  const rl = await checkRateLimit(pairingRatelimit, `pair_${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Muitas tentativas de pareamento. Aguarde um minuto." },
      { status: 429 }
    );
  }

  if (!db) {
    return NextResponse.json(
      { success: false, error: "Serviço indisponível. Tente novamente em instantes." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();

  if (code.length < 4) {
    return NextResponse.json(
      { success: false, error: "Digite o código de pareamento mostrado no painel." },
      { status: 400 }
    );
  }

  const screen = await findScreenByPairingCode(code);
  if (!screen) {
    return NextResponse.json(
      { success: false, error: "Código não encontrado. Confira no painel do estabelecimento." },
      { status: 404 }
    );
  }

  await db.collection(COLLECTIONS.SCREENS).doc(screen.id).set(
    sanitizeForFirestore({
      paired: true,
      pairedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );

  return NextResponse.json({
    success: true,
    screenId: screen.id,
    deviceSecret: screen.deviceSecret,
    bootstrap: await loadScreenBootstrap(screen),
  });
}
