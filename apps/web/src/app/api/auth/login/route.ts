import { NextResponse } from "next/server";
import { validateCredentials } from "@/mocks/auth";
import { db, COLLECTIONS } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Validação Rápida via Credenciais Mockadas (Ideal para Demonstrações e Apresentações)
    const mockUser = validateCredentials(email, password);
    if (mockUser) {
      return NextResponse.json({
        success: true,
        user: mockUser,
      });
    }

    // 2. Consulta no Firebase Firestore (se o mock não coincidir)
    try {
      if (db) {
        const usersRef = db.collection(COLLECTIONS.USERS);
        const snapshot = await usersRef.where("email", "==", email.toLowerCase()).limit(1).get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();

          if (userData && userData.passwordHash) {
            const isPasswordValid = await bcrypt.compare(password, userData.passwordHash);
            if (isPasswordValid) {
              const userPayload = {
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                tenantId: userData.tenantId || undefined,
                tenantName: userData.tenantName || undefined,
              };

              return NextResponse.json({
                success: true,
                user: userPayload,
              });
            }
          }
        }
      }
    } catch (dbError) {
      console.warn("Aviso: Firebase Firestore offline ou sem credenciais no momento. Usando apenas autenticação mockada.");
    }

    return NextResponse.json(
      { success: false, error: "Credenciais inválidas. Verifique o e-mail e a senha." },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Erro na rota /api/auth/login:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao realizar autenticação." },
      { status: 500 }
    );
  }
}
