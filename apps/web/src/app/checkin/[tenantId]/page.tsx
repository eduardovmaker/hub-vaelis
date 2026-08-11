"use client";

import React, { use, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INITIAL_PORTAL_CONFIGS } from "@/mocks/portal";
import { Store, Sparkles, CheckCircle2, Copy, Check, MessageSquare, ArrowRight, Gift, Smartphone, HeartHandshake } from "lucide-react";

export default function StandaloneCheckinPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId || "tenant_barber_02";

  const portalConfig = INITIAL_PORTAL_CONFIGS[tenantId] || INITIAL_PORTAL_CONFIGS["tenant_barber_02"];
  const tenantName = portalConfig.tenantName || "Barbearia VIP Club";
  const primaryColor = portalConfig.primaryColor || "#16A34A";

  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerBirthdate, setCustomerBirthdate] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState("");

  const handleSubmitCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerWhatsapp) return;

    const coupon = `VIP-BEMVINDO-${Math.floor(100000 + Math.random() * 900000)}`;
    setGeneratedCoupon(coupon);

    // Salvar lead no localStorage para persistência de demo
    if (typeof window !== "undefined") {
      try {
        const storedLeads = JSON.parse(localStorage.getItem(`hublocal_leads_${tenantId}`) || "[]");
        const newLead = {
          id: `checkin_${Date.now()}`,
          name: customerName,
          whatsapp: customerWhatsapp,
          connectedAt: "Hoje (QR Code Balcão)",
          birthdate: customerBirthdate || "Não informada",
          optIn: true,
          source: "QR Code Balcão / Sem Wi-Fi",
        };
        localStorage.setItem(`hublocal_leads_${tenantId}`, JSON.stringify([newLead, ...storedLeads]));
      } catch (err) {}
    }

    setIsSubmitted(true);
  };

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(generatedCoupon);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 3000);
  };

  const handleSendWhatsapp = () => {
    const text = encodeURIComponent(
      `Olá ${tenantName}! Me cadastrei pelo QR Code do Balcão!\nMeu Nome: ${customerName}\nMeu Cupom de Boas-Vindas: *${generatedCoupon}*`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-200" style={{ backgroundColor: "var(--bg-primary)" }}>
      
      {/* Header com a Marca do Estabelecimento */}
      <header className="w-full max-w-md mx-auto px-4 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg" style={{ backgroundColor: primaryColor }}>
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {tenantName}
            </h1>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5" /> Cadastro VIP do Cliente
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col items-center justify-center space-y-6">
        
        {!isSubmitted ? (
          <div className="w-full rounded-3xl border p-6 shadow-2xl space-y-5 animate-fade-in" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Clube VIP Sem Wi-Fi
              </span>
              <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Cadastre-se & Receba Vantagens!
              </h2>
              <p className="text-xs text-slate-400">
                Preencha seus dados para receber cupons exclusivos e presentes no seu aniversário na <strong>{tenantName}</strong>.
              </p>
            </div>

            <form onSubmit={handleSubmitCheckin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-400">Seu Nome Completo</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-400">Seu WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-400">Data de Aniversário (Opcional)</label>
                <input
                  type="text"
                  value={customerBirthdate}
                  onChange={(e) => setCustomerBirthdate(e.target.value)}
                  placeholder="DD/MM/AAAA (ex: 15/08/1995)"
                  className="w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Garantir Meus Benefícios VIP</span> <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full rounded-3xl border p-6 shadow-2xl space-y-5 text-center animate-scale-up border-emerald-500/30" style={{ backgroundColor: "var(--bg-surface)" }}>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-500">🎉 CADASTRO CONCLUÍDO COM SUCESSO!</span>
              <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                Bem-vindo ao Clube VIP {customerName}!
              </h2>
              <p className="text-xs text-slate-400">
                Você já está registrado para receber ofertas e felicitações de aniversário da <strong>{tenantName}</strong>.
              </p>
            </div>

            {/* Card do Cupom Boas Vindas */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2 text-white">
              <span className="text-[10px] font-bold uppercase text-slate-400">Seu Cupom de Boas-Vindas Exclusivo:</span>
              <p className="font-mono text-xl font-black text-amber-400 tracking-wider select-all">{generatedCoupon}</p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleCopyCoupon}
                className="w-full py-3 rounded-xl border font-extrabold text-xs flex items-center justify-center gap-2 transition-all hover:bg-slate-500/10"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                {copiedCoupon ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCoupon ? "Código Copiado!" : "Copiar Código do Cupom"}</span>
              </button>

              <button
                onClick={handleSendWhatsapp}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <MessageSquare className="w-4 h-4" /> Notificar Barbearia pelo WhatsApp
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t" style={{ borderColor: "var(--border-color)" }}>
        Vaelis-HUB © {new Date().getFullYear()} — Powered by {tenantName}
      </footer>

    </div>
  );
}
