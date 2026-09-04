"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Save, UploadCloud } from "lucide-react";
import type { Tenant, TenantCategory } from "@/lib/types";

const CATEGORIES: { value: TenantCategory; label: string }[] = [
  { value: "BARBEARIA", label: "Barbearia / Salão" },
  { value: "RESTAURANTE", label: "Restaurante / Bar" },
  { value: "CLINICA", label: "Clínica / Consultório" },
  { value: "ACADEMIA", label: "Academia" },
  { value: "VAREJO", label: "Varejo / Loja" },
  { value: "OUTRO", label: "Outro" },
];

/** Identidade do estabelecimento: é o que aparece nos overlays da tela. */
export function BrandTab({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "erro"; message: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tenant/${tenantId}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (data.success) setTenant(data.tenant);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [tenantId]);

  async function save() {
    if (!tenant) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/tenant/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenant.name,
          category: tenant.category,
          primaryColor: tenant.primaryColor,
          logoUrl: tenant.logoUrl || "",
          timezone: tenant.timezone,
          contactWhatsapp: tenant.contactWhatsapp || "",
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.success) {
        setTenant(data.tenant);
        setFeedback({ type: "ok", message: data.message || "Dados salvos." });
      } else {
        setFeedback({ type: "erro", message: data.error || "Não foi possível salvar." });
      }
    } finally {
      setIsSaving(false);
    }
  }

  /** A logo é pequena, então vai pelo servidor mesmo. */
  async function uploadLogo(file: File) {
    setIsUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenantId", tenantId);
      formData.append("folder", "marca");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (data.success) {
        setTenant((current) => (current ? { ...current, logoUrl: data.url } : current));
        setFeedback({ type: "ok", message: "Logo enviada. Clique em Salvar para aplicar." });
      } else {
        setFeedback({ type: "erro", message: data.error || "Falha no envio da logo." });
      }
    } finally {
      setIsUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <p className="minimal-card p-8 text-center text-sm text-[var(--text-secondary)]">
        Não foi possível carregar os dados do estabelecimento.
      </p>
    );
  }

  return (
    <section className="minimal-card max-w-3xl space-y-5 p-6">
      <h2 className="text-lg font-bold">Identidade do estabelecimento</h2>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          Nome exibido na tela
        </span>
        <input
          value={tenant.name}
          onChange={(event) => setTenant({ ...tenant, name: event.target.value })}
          className="minimal-input w-full px-4 py-3"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            Segmento
          </span>
          <select
            value={tenant.category}
            onChange={(event) =>
              setTenant({ ...tenant, category: event.target.value as TenantCategory })
            }
            className="minimal-input w-full px-4 py-3"
          >
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            Cor de destaque
          </span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={tenant.primaryColor}
              onChange={(event) => setTenant({ ...tenant, primaryColor: event.target.value })}
              className="h-12 w-16 cursor-pointer rounded-xl border-0 bg-transparent"
            />
            <input
              value={tenant.primaryColor}
              onChange={(event) => setTenant({ ...tenant, primaryColor: event.target.value })}
              className="minimal-input flex-1 px-4 py-3 font-mono text-sm"
            />
          </div>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            Fuso horário do relógio
          </span>
          <input
            value={tenant.timezone}
            onChange={(event) => setTenant({ ...tenant, timezone: event.target.value })}
            placeholder="America/Sao_Paulo"
            className="minimal-input w-full px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            WhatsApp de contato
          </span>
          <input
            value={tenant.contactWhatsapp || ""}
            onChange={(event) => setTenant({ ...tenant, contactWhatsapp: event.target.value })}
            placeholder="(11) 90000-0000"
            className="minimal-input w-full px-4 py-3"
          />
        </label>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          Logo
        </span>
        <div className="flex items-center gap-4">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt="Logo"
              className="h-16 w-auto rounded-xl bg-black/5 object-contain p-2"
            />
          ) : (
            <span className="flex h-16 w-24 items-center justify-center rounded-xl bg-black/5 text-xs text-[var(--text-secondary)]">
              Sem logo
            </span>
          )}

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadLogo(file);
            }}
          />
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-xl bg-black/5 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Enviar logo
          </button>
        </div>
      </div>

      {feedback && (
        <p
          className={`text-sm font-semibold ${
            feedback.type === "ok" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar
      </button>
    </section>
  );
}
