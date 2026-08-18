import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import bcrypt from "bcryptjs";
import { INITIAL_TV_CONFIGS, TenantTvConfig } from "@/mocks/tv";
import { INITIAL_PORTAL_CONFIGS } from "@/mocks/portal";

// Helper para timeout resiliente do banco (5000ms)
async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB Timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, category, wifiSsid, primaryColor } = body;

    if (!email || !password || !companyName) {
      return NextResponse.json(
        { success: false, error: "Preencha todos os campos obrigatórios (E-mail, Senha e Empresa)." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const slugName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const tenantId = `tenant_${slugName}_${Date.now().toString().slice(-4)}`;
    const pairingCode = `TV-${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const expires30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const selectedStarterModules: string[] = Array.isArray(body.selectedStarterModules) ? body.selectedStarterModules : [];

    const addonStatesMap: Record<string, any> = {
      "midia-indoor": { active: selectedStarterModules.includes("midia-indoor"), paymentStatus: selectedStarterModules.includes("midia-indoor") ? "PAID" : "PENDING" },
      "radio-indoor": { active: selectedStarterModules.includes("radio-indoor"), paymentStatus: selectedStarterModules.includes("radio-indoor") ? "PAID" : "PENDING" },
      "google-reviews": { active: selectedStarterModules.includes("google-reviews"), paymentStatus: selectedStarterModules.includes("google-reviews") ? "PAID" : "PENDING" },
      "whatsapp-bot": { active: selectedStarterModules.includes("whatsapp-bot"), paymentStatus: selectedStarterModules.includes("whatsapp-bot") ? "PAID" : "PENDING" },
      "roleta-da-sorte": { active: selectedStarterModules.includes("roleta-da-sorte"), paymentStatus: selectedStarterModules.includes("roleta-da-sorte") ? "PAID" : "PENDING" },
      "loja-produtos": { active: selectedStarterModules.includes("loja-produtos"), paymentStatus: selectedStarterModules.includes("loja-produtos") ? "PAID" : "PENDING" },
      "multi-unidades": { active: selectedStarterModules.includes("multi-unidades"), paymentStatus: selectedStarterModules.includes("multi-unidades") ? "PAID" : "PENDING" },
    };

    // Estrutura de dados do novo tenant
    const newTenantConfig: TenantTvConfig = {
      tenantId,
      tenantName: companyName,
      pairingCode,
      addonActive: selectedStarterModules.includes("midia-indoor"),
      showQrOverlay: true,
      showClockOverlay: true,
      autoRenew: true,
      addonStates: addonStatesMap,
      playlist: [
        {
          id: `tv_${tenantId}_1`,
          title: `Boas-vindas ao ${companyName}`,
          type: "image",
          url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80",
          durationSeconds: 10,
          active: true,
        },
      ],
    };

    // Registrar no fallback de memória
    INITIAL_TV_CONFIGS[tenantId] = newTenantConfig;
    INITIAL_PORTAL_CONFIGS[tenantId] = {
      tenantId,
      tenantName: companyName,
      tenantCategory: (category as any) || "FOOD",
      wifiSsid: wifiSsid || `${companyName}_WiFi_Gratis`,
      primaryColor: primaryColor || "#2563EB",
      banners: [
        {
          id: `b_${tenantId}_1`,
          title: `Seja Bem-Vindo ao ${companyName}!`,
          subtitle: "Conecte-se e aproveite nossa rede de alta velocidade.",
          imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
          active: true,
          order: 1,
        },
      ],
      pixPlans: [
        { id: `p1_${tenantId}`, title: "Acesso Rápido (2 Horas)", durationText: "2 Horas de Wi-Fi", price: 5.0, speedLimit: "20 Mbps" },
        { id: `p2_${tenantId}`, title: "Passaporte Dia Todo (6 Horas)", durationText: "6 Horas de Alta Velocidade", price: 10.0, speedLimit: "50 Mbps", recommended: true },
        { id: `p3_${tenantId}`, title: "Diária Sem Limites (24h)", durationText: "24 Horas sem limites", price: 18.0, speedLimit: "100 Mbps" },
      ],
      freeAccessEnabled: true,
      freeAccessDurationMinutes: 30,
      adWatchSeconds: 15,
      digitalMenuEnabled: false,
      digitalMenuUrl: "",
      digitalMenuTitle: "Cardápio Digital",
      digitalMenuButtonText: "Ver Cardápio",
      digitalMenuIcon: "utensils",
      autoRedirectToMenu: false,
    };

    // Persistir no Firebase Firestore se disponível
    try {
      if (db) {
        const batch = db.batch();

        const tenantRef = db.collection(COLLECTIONS.TENANTS).doc(tenantId);
        batch.set(tenantRef, {
          tenantName: companyName,
          category: category || "FOOD",
          wifiSsid: wifiSsid || `${companyName}_WiFi_Gratis`,
          primaryColor: primaryColor || "#2563EB",
          pairingCode,
          addonStates: newTenantConfig.addonStates,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const userRef = db.collection(COLLECTIONS.USERS).doc(cleanEmail);
        batch.set(userRef, {
          email: cleanEmail,
          name: name || companyName,
          passwordHash,
          role: "TENANT_ADMIN",
          tenantId,
          tenantName: companyName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const newPortalConfig = {
          tenantId,
          tenantName: companyName,
          tenantCategory: category || "FOOD",
          wifiSsid: wifiSsid || `${companyName}_WiFi_Gratis`,
          primaryColor: primaryColor || "#2563EB",
          banners: [
            {
              id: `b_${Date.now()}`,
              title: `Seja Bem-vindo ao ${companyName}!`,
              subtitle: "Conecte-se ao nosso Wi-Fi de alta velocidade e confira nossas novidades.",
              imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80",
              active: true,
              order: 1,
            }
          ],
          pixPlans: [
            { id: "p_1", title: "Acesso Rápido (2 Horas)", durationText: "2 Horas de Wi-Fi • 20 Mbps", price: 5.00, speedLimit: "20 Mbps", recommended: true },
            { id: "p_2", title: "Passaporte Noite Toda (6 Horas)", durationText: "6 Horas de Alta Velocidade • 50 Mbps", price: 10.00, speedLimit: "50 Mbps", recommended: false },
            { id: "p_3", title: "Diária Ilimitada (24h)", durationText: "24 Horas sem Limites • 100 Mbps", price: 18.00, speedLimit: "100 Mbps", recommended: false },
          ],
          freeAccessEnabled: true,
          freeAccessDurationMinutes: 30,
          adWatchSeconds: 15,
          digitalMenuEnabled: true,
          digitalMenuUrl: "",
          digitalMenuTitle: "Cardápio & Serviços",
          digitalMenuButtonText: "Ver Cardápio & Serviços",
          digitalMenuIcon: "utensils",
          autoRedirectToMenu: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const newTvConfig = {
          tenantId,
          tenantName: companyName,
          pairingCode: `TV-${Math.floor(1000 + Math.random() * 9000)}`,
          addonActive: true,
          showQrOverlay: true,
          showClockOverlay: true,
          showRadioBadge: true,
          showTitleOverlay: true,
          showHeaderLogo: true,
          planCycle: body.planCycle || "MENSAL",
          paymentStatus: "PAID",
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          asaasPaymentId: `pay_asaas_${Date.now()}`,
          autoRenew: true,
          playlist: [
            {
              id: `tv_1`,
              title: `Destaques ${companyName}`,
              type: "image",
              url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
              durationSeconds: 12,
              active: true,
            }
          ],
          addonStates: addonStatesMap,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const portalRef = db.collection(COLLECTIONS.PORTAL_CONFIGS).doc(tenantId);
        batch.set(portalRef, newPortalConfig);

        const tvRef = db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId);
        batch.set(tvRef, newTvConfig);

        await withDbTimeout(batch.commit(), 300);
      }
    } catch (dbErr) {
      console.warn("Aviso: Firebase offline ao processar checkout. Cadastro efetuado com sucesso em memória.");
    }

    const userPayload = {
      id: `user_${tenantId}`,
      name: name || companyName,
      email: cleanEmail,
      role: "TENANT_ADMIN" as const,
      tenantId,
      tenantName: companyName,
    };

    // Integrar com o Gateway Asaas para Geração do Pix e QR Code
    const { createOrGetAsaasCustomer, createAsaasPixPayment, createAsaasPaymentLink } = await import("@/lib/asaas");
    
    const asaasCustomer = await createOrGetAsaasCustomer({
      name: name || companyName,
      email: cleanEmail,
    });

    const paymentAmount = typeof body.totalAmount === "number" && body.totalAmount > 0
      ? body.totalAmount
      : (body.planCycle === "ANUAL" ? 399.00 : 39.90);

    const planLabel = body.planCycle === "ANUAL"
      ? `Anual (R$ ${paymentAmount.toFixed(2)})`
      : `Mensal (R$ ${paymentAmount.toFixed(2)})`;

    const asaasPayment = await createAsaasPixPayment({
      customerId: asaasCustomer.id,
      value: paymentAmount,
      description: `Vaelis-HUB - Assinatura Plano ${planLabel} para ${companyName}`,
      externalReference: tenantId,
    });

    const asaasPaymentLink = await createAsaasPaymentLink({
      name: `Assinatura Vaelis-HUB - ${companyName}`,
      description: `Plano ${planLabel}`,
      value: paymentAmount,
    });

    return NextResponse.json({
      success: true,
      tenantId,
      user: userPayload,
      asaas: {
        customerId: asaasCustomer.id,
        paymentId: asaasPayment.id,
        status: asaasPayment.status,
        invoiceUrl: asaasPayment.invoiceUrl,
        paymentLinkUrl: asaasPaymentLink.url,
        pixQrCodeImage: asaasPayment.pixQrCode?.encodedImage || "",
        pixCopyPaste: asaasPayment.pixQrCode?.payload || "",
        expiresAt: asaasPayment.pixQrCode?.expirationDate || "",
      },
    });
  } catch (err: any) {
    console.error("Erro ao processar checkout:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro interno no servidor de checkout." },
      { status: 500 }
    );
  }
}
