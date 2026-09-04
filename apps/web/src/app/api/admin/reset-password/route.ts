import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, COLLECTIONS } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";

/** Redefine a senha de acesso de um estabelecimento. Restrito ao super admin. */
export async function POST(request: Request) {
  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const { tenantId, email, newPassword } = await request.json().catch(() => ({}));

  if (!newPassword || String(newPassword).length < 8) {
    return NextResponse.json(
      { success: false, error: "A nova senha deve ter no mínimo 8 caracteres." },
      { status: 400 }
    );
  }

  if (!email && !tenantId) {
    return NextResponse.json(
      { success: false, error: "Informe o e-mail do usuário ou o ID do estabelecimento." },
      { status: 400 }
    );
  }

  const usersRef = db.collection(COLLECTIONS.USERS);
  const snapshot = email
    ? await usersRef.where("email", "==", String(email).toLowerCase().trim()).get()
    : await usersRef.where("tenantId", "==", String(tenantId)).get();

  if (snapshot.empty) {
    return NextResponse.json(
      { success: false, error: "Nenhum usuário encontrado com esses dados." },
      { status: 404 }
    );
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  const batch = db.batch();
  snapshot.docs.forEach((doc) =>
    batch.update(doc.ref, { passwordHash, updatedAt: new Date().toISOString() })
  );
  await batch.commit();

  return NextResponse.json({
    success: true,
    updatedCount: snapshot.size,
    message: `Senha redefinida para ${snapshot.size} usuário(s).`,
  });
}
