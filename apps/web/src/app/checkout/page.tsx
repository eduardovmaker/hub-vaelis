"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Wifi, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  Lock, 
  Mail, 
  Store, 
  User, 
  ArrowRight, 
  Building2, 
  Check, 
  CreditCard, 
  ExternalLink,
  Terminal,
  FileText,
  Server
} from "lucide-react";

export default function PublicCheckoutPage() {
  const router = useRouter();
  const { setSessionUser } = useAuth();

  // Etapas: 1 = Formulário Dados | 2 = Pagamento Asaas PIX | 3 = Sucesso & Provisionamento
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Passo 1: Dados Cadastrais do Cliente & Estabelecimento
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [category, setCategory] = useState("FOOD");
  const [wifiSsid, setWifiSsid] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [selectedStarterModules, setSelectedStarterModules] = useState<string[]>([
    "midia-indoor",
    "radio-indoor",
    "google-reviews",
    "checkin-qrcode",
    "whatsapp-bot",
  ]);

  const toggleStarterModule = (modId: string) => {
    if (selectedStarterModules.includes(modId)) {
      setSelectedStarterModules(selectedStarterModules.filter((m) => m !== modId));
    } else {
      setSelectedStarterModules([...selectedStarterModules, modId]);
    }
  };

  // Plano Escolhido
  const [selectedPlanCycle, setSelectedPlanCycle] = useState<"MENSAL" | "ANUAL">("MENSAL");

  // Passo 2: Estado do Pagamento PIX Asaas
  const [pixCopied, setPixCopied] = useState(false);
  const [pixSimulatingTimer, setPixSimulatingTimer] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);

  // Passo 3: Dados Retornados pelo Provisionamento
  const [createdTenantData, setCreatedTenantData] = useState<any>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Simulação do Timer PIX no Passo 2
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && !isProcessing) {
      interval = setInterval(() => {
        setPixSimulatingTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            executeAutomatedProvisioning();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, isProcessing]);

  // Handler para Avançar para o Pagamento
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !companyName) return;
    setStep(2);
    setPixSimulatingTimer(3);
  };

  // Handler para Executar o Provisionamento Automático
  const executeAutomatedProvisioning = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/checkout/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ownerName || companyName,
          email,
          password,
          companyName,
          category,
          wifiSsid: wifiSsid || `${companyName}_WiFi_Gratis`,
          primaryColor,
          planCycle: selectedPlanCycle,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreatedTenantData(data);
        setStep(3);
      }
    } catch (err) {
      console.error("Erro ao provisionar conta:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText("00020126580014BR.GOV.BCB.PIX0136vaelis-hub-asaas-checkout-pix-key-991204000530398654099.005802BR5925VAELIS HUB TECNOLOGIA SA6009SAO PAULO62070503***6304E8A1");
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const copyMikrotikScript = () => {
    if (createdTenantData?.mikrotikScript) {
      navigator.clipboard.writeText(createdTenantData.mikrotikScript);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    }
  };

  const handleAccessDashboardNow = () => {
    if (createdTenantData?.user) {
      setSessionUser(createdTenantData.user);
      router.push(`/tenant/${createdTenantData.tenantId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header com Logo Vaelis-HUB e Theme Toggle */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Zap className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Vaelis<span style={{ color: "var(--brand-primary)" }}>-HUB</span>
            </h1>
            <p className="text-xs font-medium text-slate-400">
              Plataforma Omnichannel de Engajamento, Mídia Indoor & Captive Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href="/login" className="px-3.5 py-1.5 rounded-xl border text-xs font-bold text-slate-400 hover:text-white transition-all" style={{ borderColor: "var(--border-color)" }}>
            Já sou cliente (Login)
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo Principal do Checkout */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-4 space-y-6">
        
        {/* Indicador dos Passos */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-bold">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${step >= 1 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>Dados do Estabelecimento</span>
          </div>
          <div className="w-6 h-px bg-slate-700" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${step >= 2 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>Pagamento Instantâneo</span>
          </div>
          <div className="w-6 h-px bg-slate-700" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${step === 3 ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"}`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            <span>Ativação & Acesso ao Painel</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PASSO 1: DADOS CADASTRAIS DO CLIENTE & ESTABELECIMENTO                    */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="rounded-2xl border p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="space-y-1 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ativação Imediata & Instantânea
              </span>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Ativar Plataforma Vaelis-HUB
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl mx-auto">
                Cadastre sua empresa para liberar o painel completo com Mídia Indoor TV, Rádio Comercial sem anúncios, Automação de Avaliações Google e Módulo Wi-Fi.
              </p>
            </div>

            {/* Escolha de Plano */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanCycle("MENSAL")}
                className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                  selectedPlanCycle === "MENSAL" ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20" : ""
                }`}
                style={{ borderColor: selectedPlanCycle === "MENSAL" ? undefined : "var(--border-color)", backgroundColor: "var(--bg-primary)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Plano Mensal Enterprise</span>
                  <span className="text-xs font-black text-blue-500">R$ 99,00 /mês</span>
                </div>
                <p className="text-[11px] text-slate-400">Sem fidelidade contratual • Cancele a qualquer momento</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlanCycle("ANUAL")}
                className={`p-4 rounded-xl border text-left space-y-1 transition-all relative ${
                  selectedPlanCycle === "ANUAL" ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20" : ""
                }`}
                style={{ borderColor: selectedPlanCycle === "ANUAL" ? undefined : "var(--border-color)", backgroundColor: "var(--bg-primary)" }}
              >
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] uppercase">
                  Economize 25%
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Plano Anual Enterprise</span>
                  <span className="text-xs font-black text-emerald-500">R$ 890,00 /ano</span>
                </div>
                <p className="text-[11px] text-slate-400">Equivalente a R$ 74,00/mês no Pix</p>
              </button>
            </div>

            <form onSubmit={handleProceedToPayment} className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-400">Seu Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-400">E-mail de Login *</label>
                  <input
                    type="email"
                    required
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-400">Senha de Acesso *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-400">Nome do Estabelecimento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Padaria & Restô Bella Vista"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-400">Segmento do Negócio</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  >
                    <option value="FOOD">Restaurante / Bar / Gastronomia</option>
                    <option value="BARBER">Barbearia / Salão de Beleza / Estética</option>
                    <option value="RETAIL">Varejo / Loja / Comércio</option>
                    <option value="SERVICES">Serviços / Saúde / Outros</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-400">SSID do Wi-Fi (Opcional se utilizar Módulo Wi-Fi)</label>
                  <input
                    type="text"
                    placeholder="Ex: BellaVista_WiFi_Gratis"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              {/* SELEÇÃO MODULAR INICIAL DE FUNCIONALIDADES */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Módulos Iniciais Selecionados
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Escolha os recursos que deseja utilizar imediatamente na sua plataforma:
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 uppercase">
                    {selectedStarterModules.length} Módulo(s) Ativos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "midia-indoor", label: "📺 TV Mídia Indoor & Digital Signage", badge: "Smart TV" },
                    { id: "radio-indoor", label: "🎵 Rádio Comercial & Som Ambiente", badge: "Áudio" },
                    { id: "google-reviews", label: "⭐ Avaliações 5 Estrelas no Google", badge: "Reputação" },
                    { id: "checkin-qrcode", label: "📱 QR Code Balcão & Check-in VIP", badge: "Sem Wi-Fi" },
                    { id: "whatsapp-bot", label: "💬 WhatsApp Bot & CRM de Leads", badge: "CRM" },
                    { id: "roleta-da-sorte", label: "🎯 Roleta da Sorte & Gamificação", badge: "Engajamento" },
                    { id: "loja-produtos", label: "🛍️ Loja Virtual & Vendas Pix", badge: "Vendas" },
                    { id: "captive-portal", label: "🌐 Hotspot Wi-Fi Captive Portal", badge: "MikroTik" },
                  ].map((m) => {
                    const isChecked = selectedStarterModules.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleStarterModule(m.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all select-none ${
                          isChecked ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400" : "bg-slate-500/5 opacity-60"
                        }`}
                        style={{ borderColor: isChecked ? undefined : "var(--border-color)" }}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                          <span className="font-bold text-xs">{m.label}</span>
                        </div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                          m.id === "captive-portal" ? "bg-purple-500/20 text-purple-500" : "bg-blue-500/20 text-blue-600"
                        }`}>
                          {m.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all hover:bg-blue-700 active:scale-[0.99] pt-2"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <span>Prosseguir para Pagamento & Liberar Acesso</span> <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASSO 2: PAGAMENTO VIA PIX ASAAS GATEWAY                                  */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="rounded-2xl border p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in text-center" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Gateway de Pagamento Seguro
              </span>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Pagamento Instantâneo via Pix
              </h2>
              <p className="text-xs text-slate-400">
                Escaneie o QR Code abaixo no app do seu banco. A liberação do seu painel ocorre automaticamente em segundos.
              </p>
            </div>

            {/* Imagem do QR Code Pix Asaas */}
            <div className="p-4 rounded-2xl bg-white w-56 h-56 mx-auto border shadow-inner flex items-center justify-center">
              {createdTenantData?.asaas?.pixQrCodeImage ? (
                <img
                  src={
                    createdTenantData.asaas.pixQrCodeImage.startsWith("data:")
                      ? createdTenantData.asaas.pixQrCodeImage
                      : `data:image/svg+xml;base64,${createdTenantData.asaas.pixQrCodeImage}`
                  }
                  alt="QR Code Pix Asaas"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <QrCode className="w-44 h-44 text-slate-900" />
              )}
            </div>

            <div className="max-w-md mx-auto space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const pixPayload = createdTenantData?.asaas?.pixCopyPaste || "00020126580014BR.GOV.BCB.PIX0136vaelis-hub-asaas-checkout-pix-key-991204000530398654099.005802BR5925VAELIS HUB TECNOLOGIA SA6009SAO PAULO62070503***6304E8A1";
                  navigator.clipboard.writeText(pixPayload);
                  setPixCopied(true);
                  setTimeout(() => setPixCopied(false), 3000);
                }}
                className="w-full py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-500/10 transition-all"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                {pixCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{pixCopied ? "Código PIX Copiado!" : "Copiar Chave PIX Copia e Cola"}</span>
              </button>

              {createdTenantData?.asaas?.paymentLinkUrl && (
                <a
                  href={createdTenantData.asaas.paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Link de Pagamento Direto</span>
                </a>
              )}
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 max-w-md mx-auto space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-blue-600 dark:text-blue-400">
                <span>Aguardando Confirmação do Pagamento...</span>
                <span>{pixSimulatingTimer}s</span>
              </div>
              <p className="text-[11px] text-slate-400 text-left">
                Assim que o pagamento for confirmado, seu ambiente no Vaelis-HUB será ativado e você será direcionado para o painel.
              </p>

              <button
                type="button"
                onClick={executeAutomatedProvisioning}
                disabled={isProcessing}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all disabled:opacity-60"
              >
                {isProcessing ? "Ativando Estabelecimento..." : "Confirmar Pagamento e Acessar Painel"}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASSO 3: CONFIRMAÇÃO & ENTREGA DE CREDENCIAIS + SCRIPT MIKROTIK          */}
        {/* ========================================================================= */}
        {step === 3 && createdTenantData && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Banner de Sucesso */}
            <div className="rounded-2xl border p-6 shadow-2xl bg-emerald-500/10 border-emerald-500/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center font-bold shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                🎉 Estabelecimento Ativado com Sucesso!
              </h2>
              <p className="text-xs text-slate-300 max-w-lg mx-auto">
                Seu pagamento foi confirmado! O ambiente de <strong>{createdTenantData.tenantName}</strong> no Vaelis-HUB está 100% configurado e pronto para uso.
              </p>
            </div>

            {/* Cards de Credenciais & E-mail de Boas-Vindas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Credenciais de Acesso */}
              <div className="rounded-2xl border p-5 space-y-4 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
                  <Lock className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Suas Credenciais de Acesso</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Endereço de E-mail</span>
                    <p className="font-mono font-bold text-sm" style={{ color: "var(--text-primary)" }}>{createdTenantData.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Senha de Acesso</span>
                    <p className="font-mono font-bold text-sm text-amber-500">•••••••• (Sua senha definida)</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">ID do Estabelecimento</span>
                    <p className="font-mono font-bold text-xs text-blue-600">{createdTenantData.tenantId}</p>
                  </div>
                </div>

                <button
                  onClick={handleAccessDashboardNow}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                >
                  <span>Acessar Painel Vaelis-HUB Agora</span> <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 2: E-mail de Boas-Vindas */}
              <div className="rounded-2xl border p-5 space-y-3 shadow-sm bg-slate-900 border-slate-700 text-white">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold">E-mail de Confirmação Disparado</h3>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px]">
                  <p className="text-slate-400">De: <span className="text-slate-200">suporte@vaelis.com.br</span></p>
                  <p className="text-slate-400">Para: <span className="text-emerald-400">{createdTenantData.email}</span></p>
                  <p className="text-slate-400 font-bold border-t border-slate-800 pt-1.5">Assunto: 🚀 Bem-vindo ao Vaelis-HUB! Sua conta foi ativada.</p>
                  <p className="text-slate-300 pt-1">
                    "Olá {createdTenantData.tenantName}, sua assinatura foi ativada. Acesse o seu painel para gerenciar Mídia Indoor TV, Rádio Comercial, Avaliações e Captive Portal Wi-Fi."
                  </p>
                </div>

                <p className="text-[10px] text-slate-400">
                  Os detalhes de acesso acima também foram encaminhados para o seu e-mail cadastrado.
                </p>
              </div>
            </div>

            {/* Script MikroTik ROS v7 */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-3" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Script de Automação MikroTik RouterOS v7</h3>
                </div>
                <button
                  onClick={copyMikrotikScript}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:bg-slate-500/10 transition-all"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? "Script Copiado!" : "Copiar Script MikroTik"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                {createdTenantData.mikrotikScript}
              </pre>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs border-t" style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}>
        Vaelis-HUB © {new Date().getFullYear()} — Plataforma Omnichannel de Engajamento & Mídia para Estabelecimentos
      </footer>
    </div>
  );
}
