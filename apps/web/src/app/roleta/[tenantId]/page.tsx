"use client";

import React, { use, useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INITIAL_PORTAL_CONFIGS } from "@/mocks/portal";
import { INITIAL_TV_CONFIGS } from "@/mocks/tv";
import { 
  Dices, 
  Sparkles, 
  Trophy, 
  Check, 
  Copy, 
  MessageSquare, 
  ArrowRight, 
  Store, 
  RefreshCw,
  Clock,
  ShoppingBag,
  Zap
} from "lucide-react";

interface Prize {
  id: string;
  name: string;
  chancePercent: number;
  color?: string;
}

const DEFAULT_PRIZES: Prize[] = [
  { id: "p1", name: "15% OFF na Pomada Matte", chancePercent: 30, color: "#e11d48" },
  { id: "p2", name: "🍺 Cerveja Trincando Cortesia", chancePercent: 25, color: "#d97706" },
  { id: "p3", name: "💈 20% OFF na Barba Terapia", chancePercent: 20, color: "#2563eb" },
  { id: "p4", name: "☕ Café Expresso Especial", chancePercent: 15, color: "#059669" },
  { id: "p5", name: "✂️ R$ 10 de Desconto", chancePercent: 10, color: "#7c3aed" },
];

export default function ExternalRoletaPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  const readableName = tenantId
    .replace(/^tenant_/, "")
    .replace(/_\d+$/, "")
    .split("_")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const portalConfig = INITIAL_PORTAL_CONFIGS[tenantId] || {};
  const tvConfig = INITIAL_TV_CONFIGS[tenantId] || {};

  const tenantName = portalConfig.tenantName || readableName || tenantId;
  const primaryColor = portalConfig.primaryColor || "#16A34A";

  const [prizes, setPrizes] = useState<Prize[]>(DEFAULT_PRIZES);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [hasRegistered, setHasRegistered] = useState(false);

  // Estados do Giro da Roleta
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  // Estado do Cronômetro de Urgência (2 Horas = 7200 Segundos)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(7200);

  // Auto-preenchimento vindo do Check-in Balcão via Query Params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const qName = searchParams.get("name");
      const qPhone = searchParams.get("phone") || searchParams.get("whatsapp");
      if (qName) setCustomerName(qName);
      if (qPhone) setCustomerWhatsapp(qPhone);
      if (qName && qPhone) setHasRegistered(true);
    }
  }, []);

  // Carregar prêmios configurados pelo estabelecimento se disponíveis
  useEffect(() => {
    if (tvConfig.roletaSorteConfig?.prizes && tvConfig.roletaSorteConfig.prizes.length > 0) {
      const colors = ["#e11d48", "#d97706", "#2563eb", "#059669", "#7c3aed", "#0891b2"];
      const formatted = tvConfig.roletaSorteConfig.prizes.map((p, idx) => ({
        ...p,
        color: colors[idx % colors.length],
      }));
      setPrizes(formatted);
    }
  }, [tvConfig]);

  // Efeito do Cronômetro de Contagem Regressiva de 2 Horas
  useEffect(() => {
    if (!wonPrize || !couponCode) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [wonPrize, couponCode]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStartSpin = () => {
    if (isSpinning || wonPrize) return;

    setIsSpinning(true);

    // Selecionar prêmio aleatório baseado nos prêmios disponíveis
    const prizeIndex = Math.floor(Math.random() * prizes.length);
    const selectedPrize = prizes[prizeIndex];

    // Cálculo do ângulo da roleta (pelo menos 5 voltas completas = 1800 graus)
    const segmentAngle = 360 / prizes.length;
    const targetSegmentCenter = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const extraRotations = 5 * 360;
    const finalRotation = extraRotations + targetSegmentCenter;

    setRotationDegrees(finalRotation);

    // Fazer a requisição backend para registrar o giro e gerar o cupom real no banco de dados
    fetch(`/api/tenant/${tenantId}/roleta/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prizeName: selectedPrize.name,
        prizeId: selectedPrize.id,
        customerName,
        customerWhatsapp,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTimeout(() => {
          setIsSpinning(false);
          setWonPrize(selectedPrize);
          if (data.success && data.coupon?.code) {
            setCouponCode(data.coupon.code);
          } else {
            // Fallback caso a API falhe
            setCouponCode(`ROLETA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
          }
        }, 4500);
      })
      .catch((err) => {
        console.error("Erro ao registrar giro na API:", err);
        setTimeout(() => {
          setIsSpinning(false);
          setWonPrize(selectedPrize);
          setCouponCode(`ROLETA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
        }, 4500);
      });
  };

  const handleCopyCoupon = () => {
    if (couponCode) {
      navigator.clipboard.writeText(couponCode);
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 3000);
    }
  };

  const handleSendToWhatsapp = () => {
    if (!wonPrize || !couponCode) return;
    const message = encodeURIComponent(
      `Olá ${tenantName}! Ganhei na Roleta da Sorte:\n🎁 Prêmio: *${wonPrize.name}*\n🏷️ Código do Cupom: *${couponCode}*\n⏳ Válido por 2 Horas!\nMeu Nome: ${customerName || "Cliente"}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between" style={{ backgroundColor: "var(--bg-primary)" }}>
      
      {/* Header com Marca do Estabelecimento */}
      <header className="w-full max-w-md mx-auto px-4 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg" style={{ backgroundColor: primaryColor }}>
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {tenantName}
            </h1>
            <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
              <Dices className="w-3.5 h-3.5" /> Roleta da Sorte Digital
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col items-center justify-center space-y-6">
        
        {/* Formulário Inicial de Identificação */}
        {!hasRegistered && !wonPrize && (
          <div className="w-full rounded-3xl border p-6 shadow-2xl space-y-5 animate-fade-in" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Promoção Exclusiva da Loja
              </span>
              <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Gire a Roleta e Ganhe Prêmios!
              </h2>
              <p className="text-xs text-slate-400">
                Informe seu nome para participar do sorteio instantâneo na {tenantName}.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setHasRegistered(true); }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-400">Seu Nome Completo</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-400">Seu WhatsApp (para receber o cupom)</label>
                <input
                  type="tel"
                  required
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Continuar para a Roleta</span> <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Roleta Interativa (Caso já tenha se identificado ou para Girar) */}
        {hasRegistered && !wonPrize && (
          <div className="w-full flex flex-col items-center space-y-6 animate-scale-up">
            
            {/* Indicador/Ponteiro Superior da Roleta */}
            <div className="relative flex flex-col items-center">
              <div className="w-6 h-6 bg-rose-600 rotate-45 z-20 -mb-3 shadow-md rounded-sm border-2 border-white" />

              {/* Roda da Roleta SVG / CSS Rotation */}
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border-8 border-slate-900 shadow-2xl overflow-hidden">
                <div
                  className="w-full h-full rounded-full transition-transform ease-out"
                  style={{
                    transform: `rotate(${rotationDegrees}deg)`,
                    transitionDuration: isSpinning ? "4.5s" : "0s",
                    background: `conic-gradient(${prizes.map((p, i) => `${p.color} ${(i * 100) / prizes.length}% ${((i + 1) * 100) / prizes.length}%`).join(", ")})`,
                  }}
                >
                  {/* Textos dos Prêmios no Círculo */}
                  {prizes.map((prize, idx) => {
                    const angle = (360 / prizes.length) * idx + (360 / prizes.length) / 2;
                    return (
                      <div
                        key={prize.id}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-extrabold text-[11px] text-center w-32 px-1 drop-shadow-md select-none"
                        style={{
                          transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-100px) rotate(-90deg)`,
                        }}
                      >
                        {prize.name}
                      </div>
                    );
                  })}
                </div>

                {/* Centro da Roda */}
                <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-900 border-4 border-amber-400 flex items-center justify-center shadow-inner z-10">
                  <Dices className="w-7 h-7 text-amber-400" />
                </div>
              </div>
            </div>

            {/* Botão de Disparo do Giro */}
            <button
              onClick={handleStartSpin}
              disabled={isSpinning}
              className="w-full max-w-xs py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-black text-base shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-75"
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Girando a Roleta...</span>
                </>
              ) : (
                <>
                  <Dices className="w-5 h-5" />
                  <span>GIRAR ROLETA AGORA!</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Modal de Vitória / Prêmio Conquistado - FASE 2 UI/UX DE ALTA CONVERSÃO */}
        {wonPrize && couponCode && (
          <div className="w-full rounded-3xl border p-6 shadow-2xl space-y-5 text-center animate-scale-up border-emerald-500/40 relative overflow-hidden" style={{ backgroundColor: "var(--bg-surface)" }}>
            
            {/* Banner Superior de Urgência de 2 Horas */}
            <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 text-white py-2 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md animate-pulse">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="text-xs font-black uppercase tracking-wider">
                Parabéns! Seu cupom é válido apenas por 2 HORAS
              </span>
            </div>

            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner border border-emerald-500/30">
              <Trophy className="w-8 h-8 animate-bounce text-amber-400" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-500">🎉 VOCÊ GANHOU, {customerName || "CLIENTE"}!</span>
              <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {wonPrize.name}
              </h2>
            </div>

            {/* Destaque do Código do Cupom & Cronômetro Regressivo */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3 text-white shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] font-bold text-slate-400">
                <span>CÓDIGO DE USO ÚNICO</span>
                <span className="text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" /> EXPIRA EM
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-2xl font-black text-amber-400 tracking-wider select-all">{couponCode}</p>
                
                {/* Timer Contador Regressivo */}
                <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono text-sm font-black flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span>{formatTimer(timeLeftSeconds)}</span>
                </div>
              </div>
            </div>

            {/* BOTÃO GIGANTE CALL-TO-ACTION (FASE 2) */}
            <a
              href={`/loja/${tenantId}?coupon=${encodeURIComponent(couponCode)}`}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 group"
            >
              <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>USAR MEU DESCONTO AGORA</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Ações Secundárias */}
            <div className="space-y-2 pt-1 border-t" style={{ borderColor: "var(--border-color)" }}>
              <button
                onClick={handleCopyCoupon}
                className="w-full py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-slate-500/10"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                {copiedCoupon ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCoupon ? "Código Copiado!" : "Copiar Apenas o Código"}</span>
              </button>

              <button
                onClick={handleSendToWhatsapp}
                className="w-full py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-emerald-500" /> Receber Lembrete no WhatsApp
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer White-Label */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t" style={{ borderColor: "var(--border-color)" }}>
        © {new Date().getFullYear()} {tenantName}. Todos os direitos reservados.
      </footer>

    </div>
  );
}
