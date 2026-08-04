"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PortalBanner } from "@/mocks/portal";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface BannerCarouselProps {
  banners: PortalBanner[];
  autoPlayInterval?: number; // em ms
  compact?: boolean;
}

export function BannerCarousel({ banners, autoPlayInterval = 4000, compact = false }: BannerCarouselProps) {
  const activeBanners = banners.filter((b) => b.active);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    if (activeBanners.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const prevSlide = () => {
    if (activeBanners.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + activeBanners.length) % activeBanners.length);
  };

  useEffect(() => {
    if (activeBanners.length <= 1 || isHovered || autoPlayInterval === 0) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [activeBanners.length, autoPlayInterval, isHovered, nextSlide]);

  if (activeBanners.length === 0) {
    return (
      <div className="w-full aspect-[16/9] rounded-2xl bg-slate-100 dark:bg-slate-800 border flex flex-col items-center justify-center p-6 text-center" style={{ borderColor: "var(--border-color)" }}>
        <Sparkles className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-sm font-semibold text-slate-500">Nenhum banner promocional ativo</p>
        <p className="text-xs text-slate-400">Adicione banners no painel para divulgar ofertas no Wi-Fi</p>
      </div>
    );
  }

  const current = activeBanners[currentIndex] || activeBanners[0];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl group shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Imagem com Overlay */}
      <div className={`relative w-full ${compact ? "h-48 sm:h-56" : "h-52 sm:h-64"} bg-slate-900 overflow-hidden`}>
        <img
          src={current.imageUrl}
          alt={current.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black w-fit mb-1 shadow-sm">
            <Sparkles className="w-3 h-3" /> DESTAQUE DA CASA
          </span>
          <h3 className={`${compact ? "text-base" : "text-lg sm:text-xl"} font-extrabold tracking-tight leading-snug drop-shadow`}>
            {current.title}
          </h3>
          {current.subtitle && (
            <p className="text-xs text-slate-200 mt-0.5 line-clamp-2 drop-shadow-sm font-medium">
              {current.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Botões de Navegação (Esquerda / Direita) */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Banner anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Próximo banner"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicadores de Slide (Dots) */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-2 right-4 flex items-center gap-1.5 z-10">
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Ir para o banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
