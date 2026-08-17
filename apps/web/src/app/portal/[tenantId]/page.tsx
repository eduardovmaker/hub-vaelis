"use client";

import { use, useState, useEffect } from "react";
import { INITIAL_PORTAL_CONFIGS, PixPlan, TenantPortalConfig } from "@/mocks/portal";
import { BannerCarousel } from "@/components/BannerCarousel";
import { 
  Wifi, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Zap, 
  Play, 
  ExternalLink,
  Smartphone,
  Lock,
  UtensilsCrossed,
  Scissors,
  ShoppingBag,
  Link as LinkIcon,
  X
} from "lucide-react";

export default function DynamicCaptivePortal({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;
  
  // Buscar configuração do portal diretamente do banco de dados PostgreSQL
  const [portalConfig, setPortalConfig] = useState<TenantPortalConfig>(
    INITIAL_PORTAL_CONFIGS[tenantId] || {
      tenantId,
      tenantName: tenantId || "Vaelis Portal",
      tenantCategory: "FOOD",
      wifiSsid: "WiFi_Gratis",
      primaryColor: "#2563EB",
      banners: [],
      pixPlans: [
        { id: "p1", title: "Acesso Rápido (2 Horas)", durationText: "2 Horas de Wi-Fi", price: 5.0, speedLimit: "20 Mbps" },
        { id: "p2", title: "Passaporte Dia Todo (6 Horas)", durationText: "6 Horas de Alta Velocidade", price: 10.0, speedLimit: "50 Mbps", recommended: true },
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
    }
  );

  useEffect(() => {
    async function loadPortalConfig() {
      if (!tenantId) return;
      try {
        const res = await fetch(`/api/portal/${tenantId}`);
        const data = await res.json();
        if (data.success && data.portalConfig) {
          setPortalConfig(data.portalConfig);
        }
      } catch (err) {
        console.error("Erro ao carregar portal config da API:", err);
      }
    }
    loadPortalConfig();
  }, [tenantId]);

  const [activeTab, setActiveTab] = useState<"pix" | "free">("pix");
  const [selectedPlan, setSelectedPlan] = useState<PixPlan>(
    portalConfig.pixPlans[0] || { id: "p1", title: "Acesso Rápido (2 Horas)", durationText: "2 Horas de Wi-Fi", price: 5.0, speedLimit: "20 Mbps" }
  );
  
  // Estados do Fluxo Pix
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixPaid, setPixPaid] = useState(false);
  const [pixSimulatingTimer, setPixSimulatingTimer] = useState(5);

  // Estados do Acesso Grátis (Anúncio)
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(portalConfig.adWatchSeconds);
  
  // Estado Final de Conectado
  const [isConnected, setIsConnected] = useState(false);

  // Estado do Modal de Cardápio / Serviços / Catálogo
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [autoRedirectTimer, setAutoRedirectTimer] = useState(3);
  const [autoRedirectDone, setAutoRedirectDone] = useState(false);

  // Helper para renderizar o ícone adequado ao segmento
  const renderCategoryIcon = (iconType?: string, className = "w-5 h-5") => {
    switch (iconType) {
      case "scissors":
        return <Scissors className={className} />;
      case "shopping-bag":
        return <ShoppingBag className={className} />;
      case "sparkles":
        return <Sparkles className={className} />;
      case "link":
        return <LinkIcon className={className} />;
      case "utensils":
      default:
        return <UtensilsCrossed className={className} />;
    }
  };

  // Efeito da Simulação do Pix
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showPixModal && !pixPaid) {
      interval = setInterval(() => {
        setPixSimulatingTimer((prev) => {
          if (prev <= 1) {
            setPixPaid(true);
            setTimeout(() => {
              setShowPixModal(false);
              setIsConnected(true);
            }, 1200);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showPixModal, pixPaid]);

  // Efeito da Contagem do Anúncio
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWatchingAd && adTimer > 0) {
      interval = setInterval(() => {
        setAdTimer((prev) => prev - 1);
      }, 1000);
    } else if (isWatchingAd && adTimer === 0) {
      setIsWatchingAd(false);
      setIsConnected(true);
    }
    return () => clearInterval(interval);
  }, [isWatchingAd, adTimer]);

  // Efeito de Redirecionamento Automático pós-conexão
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && portalConfig.digitalMenuEnabled && portalConfig.autoRedirectToMenu && !autoRedirectDone) {
      interval = setInterval(() => {
        setAutoRedirectTimer((prev) => {
          if (prev <= 1) {
            setAutoRedirectDone(true);
            setShowMenuModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, portalConfig.digitalMenuEnabled, portalConfig.autoRedirectToMenu, autoRedirectDone]);

  const handleCopyPix = () => {
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleStartAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) return;
    setIsWatchingAd(true);
    setAdTimer(portalConfig.adWatchSeconds);
  };

  const handleOpenMenu = () => {
    setShowMenuModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-3 sm:p-4 font-sans select-none">
      
      {/* Container Mobile Simulado */}
      <div className="w-full max-w-md mx-auto flex flex-col space-y-4">
        
        {/* Header do Estabelecimento */}
        <header className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md"
              style={{ backgroundColor: portalConfig.primaryColor || "#2563EB" }}
            >
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                {portalConfig.tenantName}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> Rede: <span className="font-mono text-slate-300">{portalConfig.wifiSsid}</span>
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            HOTSPOT ONLINE
          </span>
        </header>

        {/* BOTÃO RÁPIDO DO LINK PRINCIPAL / CARDÁPIO / SERVIÇOS (PRÉ-CONEXÃO) */}
        {portalConfig.digitalMenuEnabled && !isConnected && (
          <button
            onClick={handleOpenMenu}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-between transition-all active:scale-95"
          >
            <div className="flex items-center gap-2">
              {renderCategoryIcon(portalConfig.digitalMenuIcon, "w-4 h-4 text-black")}
              <span>{portalConfig.digitalMenuButtonText || "Ver Informações & Links"}</span>
            </div>
            <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full uppercase font-bold text-black">
              Sem precisar logar
            </span>
          </button>
        )}

        {/* TELA DE CONECTADO (SUCESSO) */}
        {isConnected ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Acesso Wi-Fi Autorizado ✓
              </span>
              <h2 className="text-2xl font-black text-white mt-2">Você está Conectado!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Navegação liberada com velocidade máxima no Wi-Fi do {portalConfig.tenantName}.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <p className="text-xs text-slate-400 uppercase font-semibold">Tempo Restante de Sessão</p>
              <div className="text-3xl font-black text-amber-400 flex items-center justify-center gap-2 font-mono">
                <Clock className="w-6 h-6 text-amber-400" />
                01:59:45
              </div>
            </div>

            {/* SEÇÃO DO LINK PRINCIPAL / CARDÁPIO / SERVIÇOS NA TELA PÓS-CONEXÃO */}
            {portalConfig.digitalMenuEnabled && (
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center gap-2">
                  {renderCategoryIcon(portalConfig.digitalMenuIcon, "w-5 h-5 text-amber-400")}
                  <div>
                    <h3 className="text-xs font-bold text-white">{portalConfig.digitalMenuTitle}</h3>
                    <p className="text-[11px] text-slate-400">Acesse diretamente pelo celular</p>
                  </div>
                </div>

                {portalConfig.autoRedirectToMenu && !autoRedirectDone && (
                  <p className="text-[11px] text-amber-400 font-semibold animate-pulse">
                    Abrindo automaticamente em {autoRedirectTimer}s...
                  </p>
                )}

                <button
                  onClick={handleOpenMenu}
                  className="w-full py-3 px-4 rounded-xl font-extrabold text-black bg-amber-400 hover:bg-amber-300 flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 text-xs transition-all active:scale-95"
                >
                  {renderCategoryIcon(portalConfig.digitalMenuIcon, "w-4 h-4 text-black")} 
                  {portalConfig.digitalMenuButtonText || "Abrir Link do Estabelecimento"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* CARROSSEL DE MARKETING DOS BANNERS */}
            <section className="w-full space-y-1">
              <div className="flex items-center justify-between text-[11px] px-1 font-semibold text-slate-400">
                <span className="flex items-center gap-1 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" /> Destaques & Promoções do Dia
                </span>
                <span>Deslize para ver</span>
              </div>
              <BannerCarousel banners={portalConfig.banners} autoPlayInterval={4000} compact />
            </section>

            {/* SELEÇÃO DE MODALIDADE DE ACESSO */}
            <main className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
              
              {/* Tabs de Seleção */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setActiveTab("pix")}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "pix"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Zap className="w-4 h-4 fill-emerald-300" /> Acesso Pix (Sem Anúncios)
                </button>
                <button
                  onClick={() => setActiveTab("free")}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "free"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Play className="w-4 h-4 fill-blue-300" /> Grátis com Anúncio
                </button>
              </div>

              {/* CONTEÚDO DA ABA PIX */}
              {activeTab === "pix" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-extrabold text-white">Escolha um Plano de Internet</h2>
                    <p className="text-xs text-slate-400">Pagamento instantâneo via Pix com liberação automática no roteador.</p>
                  </div>

                  <div className="space-y-2.5">
                    {portalConfig.pixPlans.map((plan) => {
                      const isSelected = selectedPlan.id === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                              : "border-slate-800 bg-slate-950 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-emerald-400 bg-emerald-500" : "border-slate-600"
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                {plan.title}
                                {plan.recommended && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-extrabold">POPULAR</span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400">{plan.durationText} • Velocidade {plan.speedLimit}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-base font-black text-emerald-400">R$ {plan.price.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setShowPixModal(true);
                      setPixPaid(false);
                      setPixSimulatingTimer(5);
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 text-sm"
                  >
                    <QrCode className="w-5 h-5" /> Pagar R$ {selectedPlan.price.toFixed(2)} via Pix
                  </button>
                </div>
              )}

              {/* CONTEÚDO DA ABA ACESSO GRÁTIS */}
              {activeTab === "free" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-extrabold text-white">Acesso Cortesia (30 Minutos)</h2>
                    <p className="text-xs text-slate-400">Informe seu WhatsApp e assista ao vídeo curto do patrocinador.</p>
                  </div>

                  {isWatchingAd ? (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto animate-pulse">
                        <Play className="w-6 h-6 fill-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Exibindo Anúncio Patrocinado</h3>
                        <p className="text-xs text-slate-400 mt-1">Sua internet será liberada em alguns segundos...</p>
                      </div>

                      <div className="text-4xl font-black text-blue-400 font-mono">
                        00:{adTimer < 10 ? `0${adTimer}` : adTimer}
                      </div>

                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full transition-all duration-1000" 
                          style={{ width: `${((portalConfig.adWatchSeconds - adTimer) / portalConfig.adWatchSeconds) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleStartAd} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Seu Nome Completo</label>
                        <input
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ex: Carlos Silva"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">WhatsApp / Celular</label>
                        <input
                          type="tel"
                          required
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 text-sm"
                      >
                        <Play className="w-4 h-4 fill-white" /> Assistir Anúncio (15s) e Conectar
                      </button>
                    </form>
                  )}
                </div>
              )}
            </main>
          </>
        )}

        {/* Footer */}
        <footer className="text-center text-[10px] text-slate-500 py-2">
          Powered by <span className="font-bold text-slate-400">Vaelis-HUB Enterprise</span> • Plataforma de Gestão Empresarial & Experiência
        </footer>
      </div>

      {/* MODAL DE CHECKOUT PIX */}
      {showPixModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Zap className="w-4 h-4 fill-emerald-400" /> Pagamento Instantâneo Pix
              </span>
              <button 
                onClick={() => setShowPixModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Fechar
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400">Plano Selecionado</p>
              <h3 className="text-lg font-black text-white">{selectedPlan.title}</h3>
              <p className="text-2xl font-black text-emerald-400 mt-1">R$ {selectedPlan.price.toFixed(2)}</p>
            </div>

            {/* QR Code Simulado */}
            <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto shadow-inner flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020126580014BR.GOV.BCB.PIX0136captivehub-${tenantId}-${selectedPlan.id}5204000053039865405${selectedPlan.price.toFixed(2)}5802BR5910CAPTIVEHUB6009SAOPAULO62070503***6304E2CA`}
                alt="QR Code Pix"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Chave Pix Copia e Cola */}
            <div className="space-y-2">
              <button
                onClick={handleCopyPix}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {pixCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Código Pix Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" /> Copiar Código Pix (Copia e Cola)
                  </>
                )}
              </button>
            </div>

            {/* Status do Webhook Simulado */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
              {pixPaid ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Pagamento Confirmado! Liberação efetuada...
                </span>
              ) : (
                <>
                  <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  Aguardando confirmação do banco ({pixSimulatingTimer}s)...
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DO LINK / CARDÁPIO / SERVIÇOS */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderCategoryIcon(portalConfig.digitalMenuIcon, "w-5 h-5 text-amber-400")}
                <div>
                  <h3 className="text-xs font-bold text-white">{portalConfig.digitalMenuTitle}</h3>
                  <p className="text-[10px] text-slate-400">{portalConfig.tenantName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMenuModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 overflow-y-auto p-4 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                <img
                  src={portalConfig.digitalMenuUrl}
                  alt={portalConfig.digitalMenuTitle}
                  className="w-full object-cover"
                />
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
                <p className="text-xs font-bold text-white">Prefere abrir direto no seu navegador?</p>
                <a
                  href={portalConfig.digitalMenuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-400 text-black font-extrabold text-xs w-full hover:bg-amber-300"
                >
                  Abrir Link Externo <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
