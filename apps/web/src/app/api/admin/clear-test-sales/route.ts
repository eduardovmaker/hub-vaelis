import { NextResponse } from "next/server";
import { db, COLLECTIONS, prisma } from "@/lib/db";

export async function POST() {
  try {
    let deletedFirestoreCount = 0;
    let deletedPrismaCount = 0;

    // 1. Apagar vendas de teste no Firebase Firestore
    if (db) {
      try {
        const salesSnapshot = await db.collection(COLLECTIONS.SALES).get();
        if (!salesSnapshot.empty) {
          deletedFirestoreCount = salesSnapshot.size;
          const batch = db.batch();
          salesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`[Clear Test Sales] ${deletedFirestoreCount} vendas de teste deletadas do Firestore.`);
        }
      } catch (dbErr) {
        console.warn("Aviso ao deletar vendas no Firestore:", dbErr);
      }
    }

    // 2. Apagar vendas de teste no Prisma / SQLite
    try {
      if (prisma && prisma.productSale) {
        const result = await prisma.productSale.deleteMany({});
        deletedPrismaCount = result.count;
        console.log(`[Clear Test Sales] ${deletedPrismaCount} vendas de teste deletadas do Prisma.`);
      }
    } catch (prismaErr) {
      console.warn("Aviso ao deletar vendas no Prisma:", prismaErr);
    }

    return NextResponse.json({
      success: true,
      message: "Todas as vendas de teste foram removidas com sucesso!",
      deletedCount: deletedFirestoreCount + deletedPrismaCount,
    });
  } catch (err: any) {
    console.error("Erro ao limpar vendas de teste:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao remover vendas de teste." },
      { status: 500 }
    );
  }
}
