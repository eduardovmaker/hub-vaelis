"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Image as ImageIcon,
  ListVideo,
  Loader2,
  LogOut,
  Monitor,
  Music2,
  Palette,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandTab } from "@/components/panel/BrandTab";
import { MediaTab } from "@/components/panel/MediaTab";
import { MusicTab } from "@/components/panel/MusicTab";
import { PlaylistTab } from "@/components/panel/PlaylistTab";
import { ScreensTab } from "@/components/panel/ScreensTab";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { id: "telas", label: "Telas", icon: Monitor },
  { id: "playlist", label: "Playlist", icon: ListVideo },
  { id: "biblioteca", label: "Biblioteca", icon: ImageIcon },
  { id: "musica", label: "Música", icon: Music2 },
  { id: "marca", label: "Marca", icon: Palette },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Painel do estabelecimento: programação das telas, mídias, música e marca. */
export default function TenantPanelPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, logout } = useAuth();

  const initialTab = useMemo<TabId>(() => {
    const requested = searchParams.get("tab");
    return TABS.some((tab) => tab.id === requested) ? (requested as TabId) : "telas";
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  /**
   * Nome do estabelecimento vem do cadastro, não da sessão: o super admin não
   * tem tenant vinculado e cairia no id cru (tenant_nome_1234) no cabeçalho.
   */
  useEffect(() => {
    let active = true;

    async function loadTenant() {
      try {
        const res = await fetch(`/api/tenant/${tenantId}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (active && data.success) setTenantName(data.tenant.name || "");
      } catch {
        // Cabeçalho cai para o nome da sessão; o resto do painel segue normal.
      }
    }

    loadTenant();
    return () => {
      active = false;
    };
  }, [tenantId]);

  // Guarda de navegação; a autorização real acontece nas rotas de API.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "TENANT_ADMIN" && user.tenantId !== tenantId) {
      router.replace(`/tenant/${user.tenantId}`);
    }
  }, [isLoading, user, tenantId, router]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)]">
              Vaelis Indoor
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold">
              {tenantName || user.tenantName || "Carregando..."}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/tv"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-black/5 px-4 py-2.5 text-sm font-semibold"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir player
            </a>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-xl bg-black/5 px-4 py-2.5 text-sm font-semibold text-red-500"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition ${
                  isActive
                    ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {activeTab === "telas" && <ScreensTab tenantId={tenantId} />}
        {activeTab === "playlist" && <PlaylistTab tenantId={tenantId} />}
        {activeTab === "biblioteca" && <MediaTab tenantId={tenantId} />}
        {activeTab === "musica" && <MusicTab tenantId={tenantId} />}
        {activeTab === "marca" && <BrandTab tenantId={tenantId} />}
      </main>
    </div>
  );
}
