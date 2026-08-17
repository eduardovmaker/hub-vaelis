import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando o Seed de Produção do Banco de Dados PostgreSQL do Vaelis-HUB...");

  // Limpeza prévia de todas as tabelas
  await prisma.user.deleteMany({});
  await prisma.addonState.deleteMany({});
  await prisma.portalBanner.deleteMany({});
  await prisma.pixPlan.deleteMany({});
  await prisma.portalConfig.deleteMany({});
  await prisma.tvMediaItem.deleteMany({});
  await prisma.tvConfig.deleteMany({});
  await prisma.radioIndoorConfig.deleteMany({});
  await prisma.googleReviewsConfig.deleteMany({});
  await prisma.whatsappBotConfig.deleteMany({});
  await prisma.roletaSorteConfig.deleteMany({});
  await prisma.webGuardConfig.deleteMany({});
  await prisma.tenant.deleteMany({});

  const adminEmail = "dudis.tadeu@gmail.com";
  const rawPassword = process.env.ADMIN_INITIAL_PASSWORD || "VaelisHub@2026!Prod";
  
  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.warn("⚠️  ADMIN_INITIAL_PASSWORD não definida no .env. Utilizando senha temporária inicial de produção.");
    console.warn("👉 Recomenda-se alterar a senha do Super Admin no primeiro acesso.");
  }

  const adminPasswordHash = await bcrypt.hash(rawPassword, 10);

  // Criar exclusivamente o Usuário Super Admin Principal
  const adminUser = await prisma.user.create({
    data: {
      id: "user_super_admin_master",
      email: adminEmail,
      name: "Eduardo Tadeu (Super Admin)",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Seed de Produção concluído com sucesso no PostgreSQL!");
  console.log(`👤 Super Admin criado: ${adminUser.email}`);
  console.log(`🛡️  Role: ${adminUser.role}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed do banco de dados:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

