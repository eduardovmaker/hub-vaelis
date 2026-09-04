"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  Monitor,
  Plus,
  Trash2,
  Wifi,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { formatBytes } from "@/lib/uploadClient";
import type { Tenant, TenantCategory } from "@/lib/types";

type AdminTenant = Tenant & { screenCount: number; screensOnline: number };

interface GlobalStats {
  tenants: number;
  activeTenants: number;
  screens: number;
  screensOnline: number;
  mediaAssets: number;
  storageBytes: number;
}

interface OfflineScreen {
  id: string;
  name: string;
  tenantId: string;
  tenantName: string;
  lastSeenAt: string | null;
}

const CATEGORIES: { value: TenantCategory; label: string }[] = [
  { value: "BARBEARIA", label: "Barbearia / Salão" },
  { value: "RESTAURANTE", label: "Restaurante / Bar" },
  { value: "CLINICA", label: "Clínica / Consultório" },
  { value: "ACADEMIA", label: "Academia" },
  { value: "VAREJO", label: "Varejo / Loja" },
  { value: "OUTRO", label: "Outro" },
];

/** Painel da plataforma: cadastro de clientes e monitoramento das telas. */
export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, logout } = useAuth();

  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [offlineScreens, setOfflineScreens] = useState<OfflineScreen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "erro"; message: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    category: "BARBEARIA" as TenantCategory,
  });

  const loadData = useCallback(async () => {
    const [tenantsRes, analyticsRes] = await Promise.all([
      fetch("/api/tenants", { cache: "no-store" }),
      fetch("/api/admin/global-analytics", { cache: "no-store" }),
    ]);

    const tenantsData = await tenantsRes.json().catch(() => ({}));
    const analyticsData = await analyticsRes.json().catch(() => ({}));

    if (tenantsData.success) setTenants(tenantsData.tenants || []);
    if (analyticsData.success) {
      setStats(analyticsData.stats);
      setOfflineScreens(analyticsData.offlineScreens || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "SUPER_ADMIN") {
      router.replace(user.tenantId ? `/tenant/${user.tenantId}` : "/login");
      return;
    }
    loadData();
  }, [isAuthLoading, user, router, loadData]);

  async function createTenant() {
    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!data.success) {
        setFeedback({ type: "erro", message: data.error || "Não foi possível criar o cliente." });
        return;
      }

      setForm({ name: "", email: "", password: "", category: "BARBEARIA" });
      setFeedback({ type: "ok", message: data.message });
      await loadData();
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleActive(tenant: AdminTenant) {
    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !tenant.active }),
    });
    if ((await res.json().catch(() => ({}))).success) await loadData();
  }

  async function resetPassword(tenant: AdminTenant) {
    const newPassword = window.prompt(`Nova senha de acesso para ${tenant.name} (mínimo 8 caracteres):`);
    if (!newPassword) return;

    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant.id, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setFeedback(
      data.success
        ? { type: "ok", message: data.message }
        : { type: "erro", message: data.error || "Falha ao redefinir a senha." }
    );
  }

  async function deleteTenant(tenant: AdminTenant) {
    const confirmed = window.prompt(
      `Isto exclui ${tenant.name}, suas telas, playlists e biblioteca. Digite EXCLUIR para confirmar:`
    );
    if (confirmed !== "EXCLUIR") return;

    const res = await fetch(`/api/tenants/${tenant.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setFeedback(
      data.success
        ? { type: "ok", message: data.message }
        : { type: "erro", message: data.error || "Falha ao excluir." }
    );
    if (data.success) await loadData();
  }

  if (isAuthLoading || !user || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
      </main>
    );
  }

  const summaryCards = [
    { label: "Clientes ativos", value: `${stats?.activeTenants ?? 0}/${stats?.tenants ?? 0}`, icon: Building2 },
    { label: "Telas no ar", value: `${stats?.screensOnline ?? 0}/${stats?.screens ?? 0}`, icon: Wifi },
    { label: "Mídias no R2", value: String(stats?.mediaAssets ?? 0), icon: Monitor },
    { label: "Armazenamento", value: formatBytes(stats?.storageBytes ?? 0), icon: HardDrive },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)]">
              Vaelis Indoor
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold">Administração da plataforma</h1>
          </div>
          <div className="flex items-center gap-3">
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
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="minimal-card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-2xl font-extrabold">{card.value}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {card.label}
                </p>
              </div>
            );
          })}
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

        {offlineScreens.length > 0 && (
          <section className="minimal-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Telas pareadas fora do ar
            </h2>
            <ul className="mt-4 divide-y divide-[var(--border-color)]">
              {offlineScreens.map((screen) => (
                <li key={screen.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span className="font-semibold">
                    {screen.tenantName} · {screen.name}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {screen.lastSeenAt
                      ? `Última vez ${new Date(screen.lastSeenAt).toLocaleString("pt-BR")}`
                      : "Nunca reportou presença"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="minimal-card p-6">
          <h2 className="text-lg font-bold">Novo cliente</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            O cadastro já cria o acesso ao painel, a playlist padrão e a primeira tela com código de
            pareamento.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Nome do estabelecimento"
              className="minimal-input px-4 py-3"
            />
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              type="email"
              placeholder="E-mail de acesso"
              className="minimal-input px-4 py-3"
            />
            <input
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              type="text"
              placeholder="Senha inicial (8+ caracteres)"
              className="minimal-input px-4 py-3"
            />
            <select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value as TenantCategory })
              }
              className="minimal-input px-4 py-3"
            >
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={createTenant}
            disabled={isCreating || !form.name.trim() || !form.email.trim() || form.password.length < 8}
            className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Cadastrar cliente
          </button>
        </section>

        <section className="minimal-card overflow-hidden">
          <h2 className="border-b border-[var(--border-color)] p-6 text-lg font-bold">
            Clientes ({tenants.length})
          </h2>

          {tenants.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--text-secondary)]">
              Nenhum cliente cadastrado.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-color)]">
              {tenants.map((tenant) => (
                <li key={tenant.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold">{tenant.name}</h3>
                      <span
                        className={`minimal-badge ${
                          tenant.active
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-black/5 text-[var(--text-secondary)]"
                        }`}
                      >
                        {tenant.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{tenant.id}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {tenant.screensOnline} de {tenant.screenCount}{" "}
                      {tenant.screenCount === 1 ? "tela" : "telas"} no ar
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/tenant/${tenant.id}`}
                      className="rounded-xl bg-black/5 px-4 py-2 text-xs font-bold"
                    >
                      Abrir painel
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleActive(tenant)}
                      className="rounded-xl bg-black/5 px-4 py-2 text-xs font-bold"
                    >
                      {tenant.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPassword(tenant)}
                      className="flex items-center gap-1.5 rounded-xl bg-black/5 px-4 py-2 text-xs font-bold"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Senha
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTenant(tenant)}
                      aria-label={`Excluir ${tenant.name}`}
                      className="rounded-xl p-2 text-red-500 transition hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
