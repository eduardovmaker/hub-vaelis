import { NextResponse } from "next/server";
import { validateCredentials } from "@/mocks/auth";
import { prisma } from "@/lib/db";
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

    // 2. Consulta no Banco de Dados PostgreSQL (se o mock não coincidir)
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          tenant: true,
        },
      });

      if (user) {
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (isPasswordValid) {
          const userPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId || undefined,
            tenantName: user.tenant?.tenantName || undefined,
          };

          return NextResponse.json({
            success: true,
            user: userPayload,
          });
        }
      }
    } catch (dbError) {
      console.warn("Aviso: Banco PostgreSQL offline ou inacessível no momento. Usando apenas autenticação mockada.");
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
