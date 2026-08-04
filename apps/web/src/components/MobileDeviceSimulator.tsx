"use client";

import React, { useState } from "react";
import { Smartphone, ExternalLink, RefreshCw, X } from "lucide-react";

interface MobileDeviceSimulatorProps {
  tenantId: string;
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

export function MobileDeviceSimulator({
  tenantId,
  isOpen = true,
  onClose,
  inline = false,
}: MobileDeviceSimulatorProps) {
  const [key, setKey] = useState(0);
  const portalUrl = `/portal/${tenantId}`;

  const reloadIframe = () => {
    setKey((prev) => prev + 1);
  };

  const SimulatorBody = (
    <div className="flex flex-col items-center">
      {/* Barra de Controles do Simulador */}
      <div className="w-full max-w-sm flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-700 dark:text-slate-300">Simulador de Smartphone</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadIframe}
            title="Recarregar tela do portal"
            className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold text-[11px] flex items-center gap-1 hover:bg-blue-700 transition-all shadow-sm"
          >
            Abrir Tela Cheia <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Moldura do iPhone / Smartphone */}
      <div className="relative w-[340px] h-[680px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-4 border-slate-700 flex flex-col justify-between">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-end px-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
        </div>

        {/* Tela do Celular (Iframe com o Captive Portal Dinâmico) */}
        <div className="w-full h-full bg-slate-950 rounded-[40px] overflow-hidden pt-7 relative">
          <iframe
            key={key}
            src={portalUrl}
            title="Visão do Cliente Captive Portal"
            className="w-full h-full border-0 select-none"
          />
        </div>

        {/* Barra Home do iPhone */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-600 rounded-full z-30" />
      </div>
    </div>
  );

  if (inline) {
    return SimulatorBody;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="relative rounded-3xl p-6 border max-w-md w-full flex flex-col items-center shadow-2xl animate-scale-up"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}
      >
        <div className="w-full flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Visão do Cliente (Mobile / Captive Portal)
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border hover:bg-red-500/10 text-red-500 transition-all"
              style={{ borderColor: "var(--border-color)" }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {SimulatorBody}
      </div>
    </div>
  );
}
