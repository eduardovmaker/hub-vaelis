import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { tenantId, email, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { success: false, error: "A nova senha deve ter no mínimo 4 caracteres." },
        { status: 400 }
      );
    }

    if (!email && !tenantId) {
      return NextResponse.json(
        { success: false, error: "E-mail ou ID do Tenant é obrigatório para redefinir a senha." },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    let updatedCount = 0;

    if (db) {
      const usersRef = db.collection(COLLECTIONS.USERS);
      let querySnapshot;

      if (email) {
        querySnapshot = await usersRef.where("email", "==", email.toLowerCase().trim()).get();
      } else {
        querySnapshot = await usersRef.where("tenantId", "==", tenantId).get();
      }

      if (!querySnapshot.empty) {
        const batch = db.batch();
        querySnapshot.docs.forEach((doc: any) => {
          batch.update(doc.ref, {
            passwordHash: newPasswordHash,
            updatedAt: new Date().toISOString(),
          });
          updatedCount++;
        });
        await batch.commit();
      }
    }

    return NextResponse.json({
      success: true,
      message: `Senha redefinida com sucesso para ${updatedCount > 0 ? updatedCount + " usuário(s)" : "o estabelecimento"}!`,
      updatedCount,
    });
  } catch (error: any) {
    console.error("Erro na rota /api/admin/reset-password:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao redefinir senha." },
      { status: 500 }
    );
  }
}
