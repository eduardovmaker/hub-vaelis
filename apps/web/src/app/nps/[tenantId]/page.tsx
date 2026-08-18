"use client";

import React, { use, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INITIAL_PORTAL_CONFIGS } from "@/mocks/portal";
import { INITIAL_TV_CONFIGS } from "@/mocks/tv";
import { Star, Sparkles, Store, MessageSquare, ExternalLink, ThumbsUp, Send, CheckCircle2 } from "lucide-react";

export default function StandaloneGoogleNpsPage({ params }: { params: Promise<{ tenantId: string }> }) {
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
  const primaryColor = portalConfig.primaryColor || "#2563EB";

  const googleMapsUrl = tvConfig.googleReviewsConfig?.googleMapsUrl || "https://maps.google.com";
  const managerWhatsapp = tvConfig.googleReviewsConfig?.managerWhatsapp || "5511999999999";

  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSentFeedback, setIsSentFeedback] = useState(false);

  const handleRatingSelect = (selectedStar: number) => {
    setRating(selectedStar);
    setIsSentFeedback(false);
  };

  const handleSendPrivateFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    const cleanWhatsapp = managerWhatsapp.replace(/\D/g, "");
    const message = encodeURIComponent(
      `📌 *Feedback Privado do Cliente (NPS ${rating} Estrelas)*\n\n` +
      `*Estabelecimento:* ${tenantName}\n` +
      `*Avaliação:* ${rating}/5 Estrelas\n` +
      `*Comentário:* ${feedbackText}`
    );

    window.open(`https://wa.me/${cleanWhatsapp}?text=${message}`, "_blank");
    setIsSentFeedback(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F9FAFB] dark:bg-[#161C24] transition-colors duration-200 font-sans">
      {/* Header com a marca do Estabelecimento (Minimal Glassmorphism) */}
      <header className="w-full max-w-md mx-auto px-4 py-4 flex items-center justify-between sticky top-0 z-40 bg-white/80 dark:bg-[#161C24]/80 backdrop-blur-md border-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md" style={{ backgroundColor: primaryColor }}>
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#212B36] dark:text-white">
              {tenantName}
            </h1>
            <p className="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500" /> Pesquisa de Satisfação & NPS
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col items-center justify-center space-y-6">
        <div className="w-full bg-white dark:bg-[#212B36] rounded-2xl border-0 p-6 sm:p-8 shadow-minimal space-y-6 animate-fade-in">
          
          <div className="text-center space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5" /> Sua Opinião é Muito Importante!
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[#212B36] dark:text-white">
              Como foi sua experiência na {tenantName}?
            </h2>
            <p className="text-xs text-[#637381] dark:text-gray-400">
              Selecione uma nota de 1 a 5 estrelas abaixo para nos ajudar a melhorar continuamente.
            </p>
          </div>

          {/* Seleção Interativa de 5 Estrelas */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const activeStar = (hoverRating !== null ? hoverRating : rating) || 0;
              const isFilled = star <= activeStar;

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingSelect(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-2 transition-all transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                  aria-label={`Avaliar ${star} estrelas`}
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      isFilled ? "text-amber-400 fill-amber-400 drop-shadow-md" : "text-slate-500/30"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* FLUXO PARA 4 OU 5 ESTRELAS (POSITIVO -> GOOGLE MAPS) */}
          {rating && rating >= 4 && (
            <div className="space-y-4 pt-2 animate-scale-up text-center border-t" style={{ borderColor: "var(--border-color)" }}>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  Ficamos muito felizes que gostou! 🎉
                </h3>
                <p className="text-xs text-slate-400">
                  Que tal deixar essa avaliação pública no <strong>Google Maps</strong> para apoiar o nosso estabelecimento? Leva menos de 30 segundos!
                </p>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Star className="w-4 h-4 fill-black" />
                <span>Avaliar 5 Estrelas no Google Maps</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* FLUXO PARA 1 A 3 ESTRELAS (CRÍTICA -> GERENTE WHATSAPP) */}
          {rating && rating <= 3 && (
            <div className="space-y-4 pt-2 animate-scale-up border-t" style={{ borderColor: "var(--border-color)" }}>
              {!isSentFeedback ? (
                <form onSubmit={handleSendPrivateFeedback} className="space-y-3">
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" /> Canal Direto com o Gerente
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Lamentamos que sua experiência não tenha sido 100% perfeita. Conte-nos o que ocorreu para que o gerente possa resolver seu problema diretamente.
                    </p>
                  </div>

                  <textarea
                    required
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Escreva seu comentário ou crítica construtiva..."
                    className="w-full p-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Feedback Direto ao Gerente via WhatsApp</span>
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                  <h3 className="text-sm font-bold">Feedback Encaminhado!</h3>
                  <p className="text-xs text-slate-400">
                    Obrigado por nos ajudar a melhorar. Sua mensagem foi direcionada ao gerente da <strong>{tenantName}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer White-Label */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t" style={{ borderColor: "var(--border-color)" }}>
        © {new Date().getFullYear()} {tenantName}. Todos os direitos reservados.
      </footer>
    </div>
  );
}
