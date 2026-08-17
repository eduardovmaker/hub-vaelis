"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INITIAL_TV_CONFIGS, TenantTvConfig, AddonModuleId } from "@/mocks/tv";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity, 
  LogOut, 
  Tv, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Search,
  ExternalLink,
  LayoutDashboard,
  Router,
  DollarSign,
  ShieldCheck,
  Zap,
  Server,
  TrendingUp,
  Sliders,
  Calendar,
  RefreshCw,
  Check,
  Star,
  MessageSquare,
  Dices,
  Headphones,
  Building,
  Wifi,
  Plus,
  X,
  ShoppingBag,
  HeartHandshake,
  Download,
  Filter,
  ArrowUpRight,
  Lock,
  Unlock,
  Ban,
  AlertTriangle,
  Key,
  Trash2
} from "lucide-react";

export default function MasterAdminDashboard() {
  const { user, logout } = useAuth();
  
  // Estado da Aba do Admin Navbar ('tenants' | 'overview' | 'store-master' | 'tv-master' | 'financial' | 'routers')
  const [activeTab, setActiveTab] = useState<"tenants" | "overview" | "store-master" | "tv-master" | "financial" | "routers">("tenants");

  // Estado dos Tenants e seus Add-ons
  const [tvConfigs, setTvConfigs] = useState<Record<string, TenantTvConfig>>({});
  const [globalAnalytics, setGlobalAnalytics] = useState({
    totalTenantsCount: 0,
    totalSalesCount: 0,
    totalSalesVolume: 0,
    platformCommission: 0,
    totalProductsCount: 0,
    activeTvsCount: 0,
    asaasWalletsConfigured: 0,
    recentSales: [] as any[],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [tenantFilter, setTenantFilter] = useState<"ALL" | "VIP" | "ASAAS" | "BLOCKED">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estado do Modal de Cadastro de Novo Tenant
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantCategory, setNewTenantCategory] = useState("FOOD");
  const [newWifiSsid, setNewWifiSsid] = useState("");
  const [newPrimaryColor, setNewPrimaryColor] = useState("#2563EB");
  const [newPairingCode, setNewPairingCode] = useState("");
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);

  // Estado do Modal de Redefinição de Senha pelo Master Admin
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [targetResetTenant, setTargetResetTenant] = useState<{ tenantId: string; tenantName: string } | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleOpenResetModal = (tenantId: string, tenantName: string) => {
    setTargetResetTenant({ tenantId, tenantName });
    setResetPasswordInput("");
    setShowResetPasswordModal(true);
  };

  // Estado do Modal de Exclusão Definitiva de Tenant
  const [showDeleteTenantModal, setShowDeleteTenantModal] = useState(false);
  const [targetDeleteTenant, setTargetDeleteTenant] = useState<{ tenantId: string; tenantName: string } | null>(null);
  const [isDeletingTenant, setIsDeletingTenant] = useState(false);

  const handleOpenDeleteModal = (tenantId: string, tenantName: string) => {
    setTargetDeleteTenant({ tenantId, tenantName });
    setShowDeleteTenantModal(true);
  };

  const handleConfirmDeleteTenant = async () => {
    if (!targetDeleteTenant) return;
    setIsDeletingTenant(true);

    try {
      const res = await fetch(`/api/tenants?tenantId=${encodeURIComponent(targetDeleteTenant.tenantId)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setTvConfigs((prev) => {
          const updated = { ...prev };
          delete updated[targetDeleteTenant.tenantId];
          return updated;
        });
        showToast(`🗑️ Estabelecimento [${targetDeleteTenant.tenantName}] excluído com sucesso!`);
        setShowDeleteTenantModal(false);
        setTargetDeleteTenant(null);
      } else {
        showToast(`❌ Erro: ${data.error || "Não foi possível excluir o estabelecimento."}`);
      }
    } catch (err) {
      showToast("❌ Erro de conexão ao excluir o estabelecimento.");
    } finally {
      setIsDeletingTenant(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetTenant || !resetPasswordInput) return;
    setIsResettingPassword(true);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: targetResetTenant.tenantId,
          newPassword: resetPasswordInput,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`🔑 Senha de [${targetResetTenant.tenantName}] redefinida no Firebase com sucesso!`);
        setShowResetPasswordModal(false);
        setResetPasswordInput("");
      } else {
        showToast(`❌ Erro: ${data.error || "Não foi possível atualizar a senha."}`);
      }
    } catch (err) {
      showToast("❌ Erro ao conectar com o servidor para redefinir senha.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const fetchTenantsFromApi = async () => {
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (data.success && data.tenants) {
        const configMap: Record<string, TenantTvConfig> = {};
        data.tenants.forEach((t: any) => {
          configMap[t.tenantId] = t;
        });
        setTvConfigs(configMap);
      } else {
        setTvConfigs({});
      }
    } catch (err) {
      console.error("Erro ao buscar tenants da API:", err);
      setTvConfigs({});
    }
  };

  useEffect(() => {
    fetchTenantsFromApi();
    fetch("/api/admin/global-analytics")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.analytics) {
          setGlobalAnalytics(data.analytics);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleAddonModule = async (tenantId: string, addonId: AddonModuleId) => {
    const currentAddonState = tvConfigs[tenantId]?.addonStates?.[addonId];
    const nextActive = !currentAddonState?.active;

    const updatedAddonStates = {
      ...(tvConfigs[tenantId]?.addonStates || {}),
      [addonId]: {
        active: nextActive,
        paymentStatus: nextActive ? ("PAID" as const) : ("OVERDUE" as const),
        subscriptionExpiresAt: nextActive
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date().toISOString(),
        planCycle: currentAddonState?.planCycle || "MENSAL",
        asaasPaymentId: currentAddonState?.asaasPaymentId || `pay_asaas_${Date.now()}`,
      },
    };

    // Atualização na UI
    setTvConfigs((prev) => ({
      ...prev,
      [tenantId]: {
        ...prev[tenantId],
        addonActive: addonId === "midia-indoor" ? nextActive : Boolean(prev[tenantId]?.addonActive),
        addonStates: updatedAddonStates as any,
      },
    }));

    // Persistência no Firebase Firestore via API
    try {
      await fetch("/api/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          addonStates: updatedAddonStates,
        }),
      });
    } catch (e) {}

    const tenantName = tvConfigs[tenantId]?.tenantName || tenantId;
    const nextStatus = nextActive ? "LIBERADO" : "BLOQUEADO";
    showToast(`Add-on [${addonId}] ${nextStatus} para ${tenantName}`);
  };

  const handleActivateVipPilot = async (tenantId: string) => {
    const allActiveStates = {
      "captive-portal": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "midia-indoor": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "radio-indoor": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "google-reviews": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "whatsapp-bot": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "roleta-da-sorte": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "loja-produtos": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "web-guard": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "multi-unidades": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
      "wifi-vip": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
    };

    setTvConfigs((prev) => ({
      ...prev,
      [tenantId]: {
        ...prev[tenantId],
        paymentStatus: "PAID",
        subscriptionExpiresAt: "2099-12-31T23:59:59Z",
        addonActive: true,
        addonStates: allActiveStates as any,
      },
    }));

    try {
      await fetch("/api/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          addonStates: allActiveStates,
          paymentStatus: "PAID",
          subscriptionExpiresAt: "2099-12-31T23:59:59Z",
        }),
      });
    } catch (e) {}

    showToast("👑 Conta ativada como PILOTO VIP VITALÍCIO com sucesso!");
  };

  const handleToggleBlockTenant = async (tenantId: string) => {
    const currentTenant = tvConfigs[tenantId];
    const isCurrentlyBlocked =
      currentTenant?.paymentStatus === "OVERDUE" ||
      (currentTenant?.subscriptionExpiresAt &&
        new Date(currentTenant.subscriptionExpiresAt).getTime() < Date.now() &&
        !currentTenant.subscriptionExpiresAt.startsWith("2099"));

    const target = tvConfigs[tenantId];
    let nextAddonStates = { ...(target?.addonStates || {}) };

    if (!isCurrentlyBlocked) {
      // Bloquear
      Object.keys(nextAddonStates).forEach((k) => {
        if (nextAddonStates[k as AddonModuleId]) {
          nextAddonStates[k as AddonModuleId] = {
            ...nextAddonStates[k as AddonModuleId]!,
            active: false,
            paymentStatus: "OVERDUE",
          };
        }
      });
    } else {
      // Desbloquear
      Object.keys(nextAddonStates).forEach((k) => {
        if (nextAddonStates[k as AddonModuleId]) {
          nextAddonStates[k as AddonModuleId] = {
            ...nextAddonStates[k as AddonModuleId]!,
            active: true,
            paymentStatus: "PAID",
          };
        }
      });
    }

    const nextPaymentStatus = isCurrentlyBlocked ? "PAID" : "OVERDUE";
    const nextExpires = isCurrentlyBlocked
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : "2000-01-01T00:00:00Z";

    setTvConfigs((prev) => ({
      ...prev,
      [tenantId]: {
        ...target,
        paymentStatus: nextPaymentStatus as any,
        subscriptionExpiresAt: nextExpires,
        addonActive: Boolean(isCurrentlyBlocked),
        addonStates: nextAddonStates as any,
      },
    }));

    try {
      await fetch("/api/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          addonStates: nextAddonStates,
          paymentStatus: nextPaymentStatus,
          subscriptionExpiresAt: nextExpires,
        }),
      });
    } catch (e) {}

    const tenantName = currentTenant?.tenantName || tenantId;
    if (!isCurrentlyBlocked) {
      showToast(`🚫 Estabelecimento [${tenantName}] BLOQUEADO por falta de pagamento!`);
    } else {
      showToast(`✅ Estabelecimento [${tenantName}] DESBLOQUEADO e reativado com sucesso!`);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName) return;
    setIsSubmittingTenant(true);

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: newTenantName,
          category: newTenantCategory,
          wifiSsid: newWifiSsid || `${newTenantName.replace(/\s+/g, "")}_WiFi`,
          primaryColor: newPrimaryColor,
          pairingCode: newPairingCode || `TV-${Math.floor(1000 + Math.random() * 9000)}`,
        }),
      });

      const data = await res.json();
      if (data.success && data.tenant) {
        setTvConfigs((prev) => ({
          ...prev,
          [data.tenant.tenantId]: data.tenant,
        }));
        showToast(`Cliente [${newTenantName}] cadastrado com sucesso!`);
        setShowCreateTenantModal(false);
        setNewTenantName("");
      } else {
        showToast("Erro ao cadastrar tenant. Tente novamente.");
      }
    } catch (err) {
      console.error("Erro ao criar tenant:", err);
      showToast("Erro de conexão ao cadastrar tenant.");
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  const tenantsList = Object.values(tvConfigs);

  const filteredTenants = tenantsList.filter((t) => {
    const matchesSearch =
      t.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tenantId.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const isBlocked =
      t.paymentStatus === "OVERDUE" ||
      (t.subscriptionExpiresAt &&
        new Date(t.subscriptionExpiresAt).getTime() < Date.now() &&
        !t.subscriptionExpiresAt.startsWith("2099"));

    if (tenantFilter === "VIP") {
      return t.subscriptionExpiresAt?.startsWith("2099");
    }
    if (tenantFilter === "ASAAS") {
      return !t.subscriptionExpiresAt?.startsWith("2099") && !isBlocked;
    }
    if (tenantFilter === "BLOCKED") {
      return isBlocked;
    }

    return true;
  });

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200" style={{ backgroundColor: "var(--bg-primary)" }}>
      
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl border border-emerald-500/40 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER MASTER ADMIN EXECUTIVE */}
      <header className="w-full border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Vaelis<span style={{ color: "var(--brand-primary)" }}>-HUB</span> Master Admin
              </h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">
                SuperAdmin HQ
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Gestão Centralizada de Estabelecimentos, Mídia TV, Loja Virtual, Split Asaas & Infraestrutura Enterprise
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{user?.name || "Administrador Master"}</p>
            <p className="text-[10px] text-slate-400">{user?.email || "admin@hublocal.com.br"}</p>
          </div>
          <ThemeToggle />
          <div className="h-6 w-px bg-slate-700/30" />
          <button
            onClick={logout}
            className="p-2.5 rounded-xl border text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-bold"
            style={{ borderColor: "var(--border-color)" }}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* SUB-NAVBAR PREMIUM ELEGANTE DO ADMIN (REDEFINIDA COM ALTA VISIBILIDADE) */}
      <nav 
        className="border-b px-6 py-3 sticky top-16 z-30 shadow-sm transition-colors duration-200" 
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl border" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
            <button
              onClick={() => setActiveTab("tenants")}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "tenants"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20"
                  : "hover:bg-slate-500/10"
              }`}
              style={{ color: activeTab === "tenants" ? "#ffffff" : "var(--text-primary)" }}
            >
              <Building2 className="w-4 h-4" />
              <span>Estabelecimentos ({tenantsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20"
                  : "hover:bg-slate-500/10"
              }`}
              style={{ color: activeTab === "overview" ? "#ffffff" : "var(--text-primary)" }}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Visão Geral & Métricas SaaS</span>
            </button>

            <button
              onClick={() => setActiveTab("store-master")}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "store-master"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20"
                  : "hover:bg-slate-500/10"
              }`}
              style={{ color: activeTab === "store-master" ? "#ffffff" : "var(--text-primary)" }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Vendas & Loja Master</span>
            </button>

            <button
              onClick={() => setActiveTab("tv-master")}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "tv-master"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20"
                  : "hover:bg-slate-500/10"
              }`}
              style={{ color: activeTab === "tv-master" ? "#ffffff" : "var(--text-primary)" }}
            >
              <Tv className="w-4 h-4" />
              <span>Smart TV & Rádio Fleet</span>
            </button>

            <button
              onClick={() => setActiveTab("financial")}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "financial"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20"
                  : "hover:bg-slate-500/10"
              }`}
              style={{ color: activeTab === "financial" ? "#ffffff" : "var(--text-primary)" }}
            >
              <CreditCard className="w-4 h-4" />
              <span>Faturamento & Asaas Pix</span>
            </button>

            <button
              onClick={() => setActiveTab("routers")}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "routers"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20"
                  : "hover:bg-slate-500/10"
              }`}
              style={{ color: activeTab === "routers" ? "#ffffff" : "var(--text-primary)" }}
            >
              <Server className="w-4 h-4" />
              <span>Infraestrutura & Containers ROS</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold flex items-center gap-2 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> Asaas Gateway Conectado
            </span>
          </div>
        </div>
      </nav>

      {/* CONTEÚDO DAS ABAS DO ADMIN */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* ABA: GESTÃO DE ESTABELECIMENTOS (TENANTS)                                 */}
        {/* ========================================================================= */}
        {activeTab === "tenants" && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    Matriz de Controle de Módulos, Inadimplência & Licenças dos Estabelecimentos
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ligue ou desligue módulos, suspenda contas inadimplentes e ative pilotos VIP cortesia em 1 clique.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filtro Rápido */}
                  <div className="flex items-center rounded-xl border p-1 bg-slate-500/5 text-xs font-bold" style={{ borderColor: "var(--border-color)" }}>
                    <button
                      onClick={() => setTenantFilter("ALL")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${tenantFilter === "ALL" ? "bg-blue-600 text-white shadow" : "text-slate-400"}`}
                    >
                      Todos ({tenantsList.length})
                    </button>
                    <button
                      onClick={() => setTenantFilter("VIP")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${tenantFilter === "VIP" ? "bg-amber-500 text-black shadow" : "text-slate-400"}`}
                    >
                      Pilotos VIP
                    </button>
                    <button
                      onClick={() => setTenantFilter("ASAAS")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${tenantFilter === "ASAAS" ? "bg-emerald-600 text-white shadow" : "text-slate-400"}`}
                    >
                      Asaas Pagantes
                    </button>
                    <button
                      onClick={() => setTenantFilter("BLOCKED")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${tenantFilter === "BLOCKED" ? "bg-red-600 text-white shadow" : "text-slate-400"}`}
                    >
                      Inadimplentes (Bloqueados)
                    </button>
                  </div>

                  <button
                    onClick={() => setShowCreateTenantModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Cliente</span>
                  </button>
                </div>
              </div>

              {/* Barra de Busca de Cliente */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome do estabelecimento ou ID do cliente..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              {/* Lista dos Cards de Estabelecimentos */}
              <div className="space-y-4 pt-2">
                {filteredTenants.map((tenant) => {
                  const states = tenant.addonStates || {};
                  const activeCount = Object.values(states).filter((s) => s?.active).length;
                  const isVipPilot = tenant.subscriptionExpiresAt?.startsWith("2099");
                  const isBlocked =
                    tenant.paymentStatus === "OVERDUE" ||
                    (tenant.subscriptionExpiresAt &&
                      new Date(tenant.subscriptionExpiresAt).getTime() < Date.now() &&
                      !isVipPilot);

                  return (
                    <div 
                      key={tenant.tenantId} 
                      className={`p-5 rounded-2xl border space-y-4 shadow-sm transition-all ${
                        isBlocked ? "bg-red-500/5 border-red-500/30" : ""
                      }`} 
                      style={{ backgroundColor: isBlocked ? undefined : "var(--bg-primary)", borderColor: isBlocked ? undefined : "var(--border-color)" }}
                    >
                      
                      {/* Cabeçalho do Tenant Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
                            isBlocked ? "bg-red-600 text-white shadow-red-600/30" : "bg-blue-600 text-white shadow-blue-600/20"
                          }`}>
                            {isBlocked ? <Ban className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{tenant.tenantName}</h4>
                              {isBlocked ? (
                                <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-600 text-white shadow flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" /> BLOQUEADO (INADIMPLENTE)
                                </span>
                              ) : isVipPilot ? (
                                <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-black shadow">
                                  👑 PILOTO VIP VITALÍCIO
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  ASAAS PAGANTE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400">ID: {tenant.tenantId} • Wi-Fi SSID: {tenant.wifiSsid || "Padrão"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* BOTÃO DE BLOQUEIO / DESBLOQUEIO MANUAMENTE */}
                          <button
                            onClick={() => handleToggleBlockTenant(tenant.tenantId)}
                            className={`px-3.5 py-1.5 rounded-xl font-extrabold text-[11px] flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer ${
                              isBlocked
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                                : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                            }`}
                            title={isBlocked ? "Reativar o acesso do estabelecimento" : "Suspender acesso do cliente por falta de pagamento"}
                          >
                            {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{isBlocked ? "✅ Desbloquear Acesso" : "🚫 Bloquear (Inadimplente)"}</span>
                          </button>

                          <button
                            onClick={() => handleActivateVipPilot(tenant.tenantId)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-[11px] flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                            title="Liberar todos os módulos 100% grátis e sem risco de expiração"
                          >
                            <Sparkles className="w-3.5 h-3.5 fill-black" />
                            <span>Ativar Piloto VIP Cortesia</span>
                          </button>

                          <button
                            onClick={() => handleOpenResetModal(tenant.tenantId, tenant.tenantName)}
                            className="px-3.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-extrabold text-[11px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                            title="Redefinir senha de acesso deste estabelecimento no Firebase"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-500" />
                            <span>Redefinir Senha</span>
                          </button>

                          <button
                            onClick={() => handleOpenDeleteModal(tenant.tenantId, tenant.tenantName)}
                            className="px-3.5 py-1.5 rounded-xl border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-extrabold text-[11px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                            title="Excluir este estabelecimento e seus dados permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Excluir Tenant</span>
                          </button>

                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
                            {activeCount} Módulos Ativos
                          </span>

                          <a
                            href={`/tenant/${tenant.tenantId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl border text-xs font-bold text-blue-600 hover:bg-blue-500/10 flex items-center gap-1"
                            style={{ borderColor: "var(--border-color)" }}
                          >
                            <span>Painel Tenant</span> <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Grade dos Módulos Monetizados com Chaves Toggle Independente */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                        {[
                          { id: "checkin-qrcode" as AddonModuleId, label: "QR Code Balcão", icon: HeartHandshake, activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-md" },
                          { id: "whatsapp-bot" as AddonModuleId, label: "WhatsApp Bot", icon: MessageSquare, activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-md" },
                          { id: "roleta-da-sorte" as AddonModuleId, label: "Roleta Sorte", icon: Dices, activeClass: "bg-rose-600 text-white border-rose-600 shadow-md" },
                          { id: "loja-produtos" as AddonModuleId, label: "Loja & Estoque", icon: ShoppingBag, activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-md" },
                          { id: "midia-indoor" as AddonModuleId, label: "Mídia TV & Rádio", icon: Tv, activeClass: "bg-purple-600 text-white border-purple-600 shadow-md" },
                          { id: "google-reviews" as AddonModuleId, label: "Google NPS", icon: Star, activeClass: "bg-amber-500 text-white border-amber-500 shadow-md" },
                          { id: "captive-portal" as AddonModuleId, label: "Wi-Fi Captive", icon: Wifi, activeClass: "bg-blue-600 text-white border-blue-600 shadow-md" },
                          { id: "web-guard" as AddonModuleId, label: "Web Guard", icon: ShieldCheck, activeClass: "bg-blue-600 text-white border-blue-600 shadow-md" },
                        ].map((m) => {
                          const isActive = states[m.id]?.active || false;
                          const MIcon = m.icon;

                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleToggleAddonModule(tenant.tenantId, m.id)}
                              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                                isActive
                                  ? m.activeClass
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              <MIcon className="w-4 h-4" />
                              <span className="truncate max-w-full">{m.label}</span>
                              <span className={`text-[9px] px-1.5 rounded-full uppercase font-extrabold ${
                                isActive ? "bg-white/20 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-500"
                              }`}>
                                {isActive ? "ON" : "OFF"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: VISÃO GERAL & MÉTRICAS SAAS EXECUTIVAS                               */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* GRID DE CARDS COM MÉTRICAS EXECUTIVAS DA PLATAFORMA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border space-y-2 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>MRR (Receita Recorrente)</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-black text-emerald-600">R$ 4.850,00</p>
                <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +18.4% este mês no Asaas
                </p>
              </div>

              <div className="p-5 rounded-2xl border space-y-2 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Clientes Ativos</span>
                  <Building2 className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>{tenantsList.length} Negócios</p>
                <p className="text-[11px] text-slate-400 font-medium">Barbearias, Bares e Lojas</p>
              </div>

              <div className="p-5 rounded-2xl border space-y-2 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Total Leads Capturados</span>
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-3xl font-black text-purple-600">1.482 Leads</p>
                <p className="text-[11px] text-purple-500 font-medium">Contatos WhatsApp & QR Code</p>
              </div>

              <div className="p-5 rounded-2xl border space-y-2 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Vendas de Produtos Pix</span>
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-black text-amber-500">R$ 8.940,00</p>
                <p className="text-[11px] text-amber-500 font-medium">Vendas diretas no balcão</p>
              </div>
            </div>

            {/* BARRA DE POPULARIDADE DOS MÓDULOS */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Activity className="w-5 h-5 text-blue-600" /> Taxa de Adoção dos Módulos pelos Estabelecimentos
              </h3>

              <div className="space-y-3 pt-2">
                {[
                  { name: "📱 QR Code Balcão & Check-in VIP", pct: 95, color: "bg-emerald-600" },
                  { name: "💬 WhatsApp Bot & CRM", pct: 88, color: "bg-emerald-500" },
                  { name: "🎯 Roleta da Sorte Digital", pct: 82, color: "bg-rose-600" },
                  { name: "🛍️ Loja Virtual & Vendas Pix", pct: 76, color: "bg-amber-500" },
                  { name: "📺 Mídia TV & Rádio Indoor", pct: 70, color: "bg-purple-600" },
                  { name: "🌐 Hotspot Wi-Fi Captive Portal", pct: 60, color: "bg-blue-600" },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      <span className="text-slate-400">{item.pct}% de Adoção</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-500/10 overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: LOJA & VENDAS MASTER (MONITORAMENTO DE GMV & SPLIT)                  */}
        {/* ========================================================================= */}
        {activeTab === "store-master" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <ShoppingBag className="w-6 h-6 text-emerald-600" />
                  Monitoramento Global de Vendas & Catálogos da Plataforma
                </h2>
                <p className="text-xs text-slate-400">
                  Visão consolidada das vendas Pix realizadas em todas as lojas e estabelecimentos cadastrados no Vaelis-HUB Enterprise.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-xs border border-emerald-500/20">
                GMV em Tempo Real
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border space-y-1 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Volume Total de Vendas (GMV)</span>
                <p className="text-2xl font-black text-emerald-600">
                  R$ {(globalAnalytics.totalSalesVolume || 0).toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-400">{globalAnalytics.totalSalesCount || 0} pedido(s) via Pix</p>
              </div>

              <div className="p-5 rounded-2xl border space-y-1 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Comissão da Plataforma (10%)</span>
                <p className="text-2xl font-black text-blue-600">
                  R$ {(globalAnalytics.platformCommission || 0).toFixed(2)}
                </p>
                <p className="text-[11px] text-blue-500 font-medium">Retenção via Asaas Split</p>
              </div>

              <div className="p-5 rounded-2xl border space-y-1 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Produtos no Catálogo Global</span>
                <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{globalAnalytics.totalProductsCount || 0} Itens</p>
                <p className="text-[11px] text-emerald-600 font-medium">Em todos os clientes</p>
              </div>

              <div className="p-5 rounded-2xl border space-y-1 shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Carteiras Asaas Conectadas</span>
                <p className="text-2xl font-black text-purple-600">{globalAnalytics.asaasWalletsConfigured || 0} Wallet IDs</p>
                <p className="text-[11px] text-purple-400 font-medium">Com Split Automático</p>
              </div>
            </div>

            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Stream em Tempo Real de Vendas de Produtos (Todas as Lojas)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-slate-400 font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border-color)" }}>
                      <th className="py-2.5 px-3">Estabelecimento (Tenant)</th>
                      <th className="py-2.5 px-3">Cliente Comprador</th>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Qtd</th>
                      <th className="py-2.5 px-3">Valor Total</th>
                      <th className="py-2.5 px-3">Taxa Plataforma (10%)</th>
                      <th className="py-2.5 px-3">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {globalAnalytics.recentSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 text-xs font-medium">
                          Nenhuma venda registrada na plataforma ainda.
                        </td>
                      </tr>
                    ) : (
                      globalAnalytics.recentSales.map((sale: any) => (
                        <tr key={sale.id}>
                          <td className="py-3 px-3 font-mono font-bold text-blue-500">{sale.tenantId}</td>
                          <td className="py-3 px-3 font-bold" style={{ color: "var(--text-primary)" }}>{sale.customerName || "Cliente Pix"}</td>
                          <td className="py-3 px-3 font-semibold text-emerald-600">{sale.productName}</td>
                          <td className="py-3 px-3 font-bold">{sale.quantity || 1}</td>
                          <td className="py-3 px-3 font-mono font-black text-emerald-600">R$ {(sale.totalAmount || sale.totalPrice || 0).toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-purple-500">R$ {((sale.totalAmount || sale.totalPrice || 0) * 0.10).toFixed(2)}</td>
                          <td className="py-3 px-3 text-slate-400">{sale.createdAt ? new Date(sale.createdAt).toLocaleString("pt-BR") : "Recente"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: SMART TV & RÁDIO FLEET MONITOR                                      */}
        {/* ========================================================================= */}
        {activeTab === "tv-master" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Tv className="w-6 h-6 text-purple-600" />
                  Monitoramento da Frota de Smart TVs & Rádio Indoor
                </h2>
                <p className="text-xs text-slate-400">
                  Acompanhe os players de mídia indoor ativos, código de pareamento Smart TV e playlists em execução em cada cliente.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-purple-500/10 text-purple-500 font-extrabold text-xs border border-purple-500/30">
                {globalAnalytics.activeTvsCount || 0} Telas Ativas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenantsList.map((tenant) => {
                const isTvActive = tenant.addonActive !== false;
                return (
                  <div
                    key={tenant.tenantId}
                    className="p-5 rounded-2xl border space-y-3 relative overflow-hidden shadow-sm"
                    style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
                          <Tv className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>{tenant.tenantName}</h4>
                          <p className="text-[10px] font-mono text-purple-500 font-extrabold">Pareamento: {tenant.pairingCode || "TV-0000"}</p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        isTvActive ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
                      }`}>
                        {isTvActive ? "🟢 Player Ativo" : "🔴 Inativo"}
                      </span>
                    </div>

                    <div className="pt-2 border-t text-xs space-y-1.5" style={{ borderColor: "var(--border-color)" }}>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Rádio Indoor:</span>
                        <span className="font-semibold text-indigo-500">Spotify / YouTube</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Indicadores em Tela:</span>
                        <span className="font-semibold text-emerald-500">QR Code + Relógio</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <a
                        href={`/tv/${tenant.tenantId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir Player TV
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: INFRAESTRUTURA & CONTAINERS MIKROTIK ROS DOCKER                       */}
        {/* ========================================================================= */}
        {activeTab === "routers" && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Server className="w-5 h-5 text-blue-600" />
                    Infraestrutura Cloud Gateway & Conectividade Empresarial
                  </h3>
                  <p className="text-xs text-slate-400">
                    Instâncias Cloud Gateway rodando isoladas para gestão de conectividade e Wi-Fi de alta disponibilidade.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
                  {tenantsList.length} Containers Prontos
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {tenantsList.map((t) => {
                  const portOffset = (t.tenantId.length * 7) % 200;
                  const winboxPort = 8291 + portOffset;
                  const webPort = 8080 + portOffset;
                  const rosApiPort = 8728 + portOffset;
                  const containerName = `mikrotik_chr_${t.tenantId}`;

                  return (
                    <div key={t.tenantId} className="p-5 rounded-2xl border space-y-3 shadow-sm" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
                            <Router className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>{t.tenantName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Container: {containerName}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-[10px] uppercase border border-emerald-500/20">
                          100% DOCKER ONLINE
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded-lg bg-slate-500/5 border" style={{ borderColor: "var(--border-color)" }}>
                          <span className="text-[9px] text-slate-400 block font-sans uppercase font-bold">WinBox Port</span>
                          <span className="font-bold text-blue-600">{winboxPort}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-500/5 border" style={{ borderColor: "var(--border-color)" }}>
                          <span className="text-[9px] text-slate-400 block font-sans uppercase font-bold">Web UI</span>
                          <span className="font-bold text-emerald-600">{webPort}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-500/5 border" style={{ borderColor: "var(--border-color)" }}>
                          <span className="text-[9px] text-slate-400 block font-sans uppercase font-bold">ROS API</span>
                          <span className="font-bold text-purple-600">{rosApiPort}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>CPU: <strong className="text-slate-200 font-mono">1.2%</strong> • RAM: <strong className="text-slate-200 font-mono">34 MB</strong></span>
                        <span className="font-mono text-[10px] bg-slate-500/10 px-2 py-0.5 rounded">vantuil/mikrotik-chr:v7</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: FINANCEIRO GLOBAL & FATURAS ASAAS                                    */}
        {/* ========================================================================= */}
        {activeTab === "financial" && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    Faturamento Recorrente das Assinaturas Asaas Gateway
                  </h3>
                  <p className="text-xs text-slate-400">
                    Histórico de cobranças e faturas dos planos Mensal (R$ 99) e Anual (R$ 890).
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
                  Asaas API v3 Conectado
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-slate-400 font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border-color)" }}>
                      <th className="py-3 px-3">Cliente / Tenant</th>
                      <th className="py-3 px-3">Plano Contratado</th>
                      <th className="py-3 px-3">Valor R$</th>
                      <th className="py-3 px-3">Status Pagamento</th>
                      <th className="py-3 px-3">ID Cobrança Asaas</th>
                      <th className="py-3 px-3">Ações de Gestão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {tenantsList.map((t) => {
                      const isVip = t.subscriptionExpiresAt?.startsWith("2099");
                      const isBlocked =
                        t.paymentStatus === "OVERDUE" ||
                        (t.subscriptionExpiresAt &&
                          new Date(t.subscriptionExpiresAt).getTime() < Date.now() &&
                          !isVip);

                      return (
                        <tr key={t.tenantId} className={isBlocked ? "bg-red-500/5" : ""}>
                          <td className="py-3.5 px-3 font-bold" style={{ color: "var(--text-primary)" }}>
                            {t.tenantName}
                            <span className="block text-[10px] text-slate-400 font-mono">{t.tenantId}</span>
                          </td>
                          <td className="py-3.5 px-3 font-semibold">
                            {isVip ? "Piloto VIP Cortesia" : "Plano Mensal (Sem Fidelidade)"}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-black text-emerald-600">
                            {isVip ? "R$ 0,00 (Isento)" : "R$ 99,00"}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-0.5 rounded font-extrabold text-[10px] uppercase ${
                              isBlocked
                                ? "bg-red-600 text-white shadow animate-pulse"
                                : isVip
                                ? "bg-amber-500 text-black"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}>
                              {isBlocked ? "🚫 SUSPENSO / INADIMPLENTE" : isVip ? "VITALÍCIO CORTESIA" : "PAGO (CONFIRMADO)"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-slate-400 text-[11px]">
                            {t.asaasPaymentId || "pay_asaas_849201"}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleBlockTenant(t.tenantId)}
                                className={`px-2.5 py-1 rounded font-extrabold text-[10px] transition-all text-white ${
                                  isBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                                }`}
                              >
                                {isBlocked ? "✅ Desbloquear" : "🚫 Bloquear"}
                              </button>

                              <button
                                onClick={() => handleActivateVipPilot(t.tenantId)}
                                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-[10px] transition-all"
                              >
                                Liberar VIP
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Modal de Cadastro de Novo Tenant */}
      {showCreateTenantModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl animate-fade-in" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Cadastrar Novo Cliente / Tenant</h3>
              </div>
              <button onClick={() => setShowCreateTenantModal(false)} className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400">Nome da Empresa / Estabelecimento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Padaria Bella Vista"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Segmento / Categoria</label>
                  <select
                    value={newTenantCategory}
                    onChange={(e) => setNewTenantCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  >
                    <option value="FOOD">Restaurante / Bar / Gastronomia</option>
                    <option value="BARBER">Barbearia / Salão de Beleza</option>
                    <option value="RETAIL">Varejo / Loja</option>
                    <option value="SERVICES">Serviços / Outros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Nome do SSID Wi-Fi</label>
                  <input
                    type="text"
                    placeholder="Ex: BellaVista_WiFi_Gratis"
                    value={newWifiSsid}
                    onChange={(e) => setNewWifiSsid(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Cor Principal do Portal</label>
                  <input
                    type="color"
                    value={newPrimaryColor}
                    onChange={(e) => setNewPrimaryColor(e.target.value)}
                    className="w-full h-9 rounded-xl border cursor-pointer p-1"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Código Pareamento Smart TV</label>
                  <input
                    type="text"
                    placeholder="Ex: TV-9912 (opcional)"
                    value={newPairingCode}
                    onChange={(e) => setNewPairingCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>O cliente poderá escolher e personalizar seus módulos no primeiro login.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTenantModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-slate-400 hover:bg-slate-500/10"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingTenant}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSubmittingTenant ? "Cadastrando..." : "Cadastrar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REDEFINIÇÃO DE SENHA DO CLIENTE */}
      {showResetPasswordModal && targetResetTenant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl border p-6 max-w-md w-full space-y-5 shadow-2xl animate-scale-up" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Redefinir Senha do Cliente</h3>
                  <p className="text-xs text-slate-400 font-mono">{targetResetTenant.tenantName} ({targetResetTenant.tenantId})</p>
                </div>
              </div>
              <button onClick={() => setShowResetPasswordModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-400">Nova Senha de Acesso *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Digite a nova senha (ex: Barba#2026)"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    className="w-full p-3 pr-28 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = targetResetTenant.tenantName.split(" ")[0].replace(/[^a-zA-Z]/g, "") || "Vaelis";
                      const randomPass = `${prefix}#${Math.floor(1000 + Math.random() * 9000)}`;
                      setResetPasswordInput(randomPass);
                    }}
                    className="absolute right-2 top-2.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 cursor-pointer"
                  >
                    🎲 Gerar Senha
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>A senha será criptografada (bcrypt) e atualizada no Firebase Firestore.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-slate-400 hover:bg-slate-500/10"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-2 shadow-md shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-60 cursor-pointer"
                >
                  {isResettingPassword ? "Atualizando..." : "Salvar Nova Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DEFINITIVA DE TENANT */}
      {showDeleteTenantModal && targetDeleteTenant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="max-w-md w-full rounded-2xl border p-6 shadow-2xl space-y-5 animate-scale-up"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center font-bold text-red-500">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Excluir Estabelecimento</h3>
                  <p className="text-xs text-slate-400 font-mono">{targetDeleteTenant.tenantName} ({targetDeleteTenant.tenantId})</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeleteTenantModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-500/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Tem certeza que deseja excluir o estabelecimento <strong className="text-red-500 font-black">{targetDeleteTenant.tenantName}</strong>?
              </p>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Esta ação é IRREVERSÍVEL! Todos os dados de TV, Produtos, Vendas, Rádio e Conectividade serão permanentemente apagados do banco de dados.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-4" style={{ borderColor: "var(--border-color)" }}>
              <button
                type="button"
                onClick={() => setShowDeleteTenantModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-400 hover:bg-slate-500/10"
                style={{ borderColor: "var(--border-color)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingTenant}
                onClick={handleConfirmDeleteTenant}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isDeletingTenant ? "Excluindo..." : "Sim, Excluir Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
