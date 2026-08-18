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
  Trash2,
  Save,
  Loader2
} from "lucide-react";

export default function MasterAdminDashboard() {
  const { user, logout } = useAuth();
  
  // Estado da Aba do Admin Navbar ('tenants' | 'overview' | 'store-master' | 'tv-master' | 'financial')
  const [activeTab, setActiveTab] = useState<"tenants" | "overview" | "store-master" | "tv-master" | "financial">("tenants");

  // Estado dos Tenants e seus Add-ons
  const [tvConfigs, setTvConfigs] = useState<Record<string, TenantTvConfig>>({});
  const [globalAnalytics, setGlobalAnalytics] = useState({
    totalTenantsCount: 0,
    activeTenantsCount: 0,
    totalMrr: 0,
    totalLeadsCount: 0,
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
  const [loadingModules, setLoadingModules] = useState<Record<string, boolean>>({});

  // Estado do Modal de Cadastro de Novo Tenant
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
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

  const handleUpdatePlatformFee = async (tenantId: string, newFee: number) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/asaas-fee`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformFeePercentage: newFee }),
      });
      const data = await res.json();
      if (data.success) {
        setTvConfigs((prev) => ({
          ...prev,
          [tenantId]: {
            ...prev[tenantId],
            platformFeePercentage: data.platformFeePercentage,
            splitPercentage: data.splitPercentage,
          } as any,
        }));
        showToast(`✅ Taxa da plataforma do tenant [${tenantId}] alterada para ${data.platformFeePercentage}%!`);
      } else {
        showToast(`❌ Erro: ${data.error || "Não foi possível atualizar a taxa."}`);
      }
    } catch (err) {
      showToast("❌ Erro de conexão ao atualizar a taxa da plataforma.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleAddonModule = async (tenantId: string, addonId: AddonModuleId) => {
    const key = `${tenantId}_${addonId}`;
    setLoadingModules((prev) => ({ ...prev, [key]: true }));

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

    // Atualização otimista na UI
    setTvConfigs((prev) => ({
      ...prev,
      [tenantId]: {
        ...prev[tenantId],
        addonActive: addonId === "midia-indoor" ? nextActive : Boolean(prev[tenantId]?.addonActive),
        addonStates: updatedAddonStates as any,
      },
    }));

    const tenantName = tvConfigs[tenantId]?.tenantName || tenantId;
    const nextStatusText = nextActive ? "LIBERADO (ON)" : "DESATIVADO (OFF)";

    // Persistência no Firebase Firestore via API
    try {
      const res = await fetch("/api/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          addonStates: updatedAddonStates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Módulo [${addonId}] ${nextStatusText} para ${tenantName}`);
      } else {
        showToast(`❌ Erro ao salvar no banco: ${data.error || "Falha na API"}`);
      }
    } catch (e) {
      showToast(`❌ Erro de conexão ao atualizar o módulo [${addonId}]`);
    } finally {
      setLoadingModules((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleActivateVipPilot = async (tenantId: string) => {
    const allActiveStates = {
      "checkin-qrcode": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: "2099-12-31T23:59:59Z" },
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
          email: newTenantEmail,
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
        setNewTenantEmail("");
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
    <div className="min-h-screen relative flex flex-col justify-between bg-[#F9FAFB] dark:bg-[#161C24] transition-colors duration-200 font-sans overflow-x-hidden">
      {/* Background Soft Aura Gradient (Inspiração Minimal UI & Tela de Login) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/50 via-indigo-50/30 to-transparent dark:from-blue-900/10 dark:via-transparent pointer-events-none rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-sky-100/40 via-purple-50/20 to-transparent dark:from-purple-950/10 dark:via-transparent pointer-events-none rounded-full blur-3xl -z-10 transform -translate-x-1/3 translate-y-1/3" />
      
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl bg-[#212B36] text-white font-bold text-xs shadow-minimal-dialog border-0 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
        {/* LEFT SIDEMENU (SIDEBAR NA ESQUERDA - PADRÃO MINIMAL UI KIT) */}
        <aside className="w-full lg:w-72 shrink-0 bg-white dark:bg-[#212B36] border-r border-[#919EAB]/12 flex flex-col justify-between p-6 sticky top-0 lg:h-screen select-none">
          <div className="space-y-6">
            {/* LOGO DO HUB VAELIS */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2065D1] text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-[#212B36] dark:text-white">
                  Vaelis<span className="text-[#2065D1]">.HUB</span>
                </h1>
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#2065D1]/10 text-[#2065D1]">
                  Master Admin
                </span>
              </div>
            </div>

            {/* CARD SELETOR DE WORKSPACE / TENANT MASTER */}
            <div className="p-3.5 rounded-2xl bg-gray-100/80 dark:bg-zinc-800/60 flex items-center gap-3 border border-[#919EAB]/12">
              <div className="w-9 h-9 rounded-xl bg-[#2065D1] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                HQ
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#212B36] dark:text-white truncate">SuperAdmin HQ</p>
                <span className="text-[10px] text-[#637381] dark:text-gray-400 block font-semibold">Plano Master SaaS</span>
              </div>
            </div>

            {/* MENU DE NAVEGAÇÃO VERTICAL NA ESQUERDA (MINIMAL PILLS) */}
            <nav className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#919EAB] px-3 pb-1">
                Navegação Geral
              </p>

              <button
                onClick={() => setActiveTab("tenants")}
                className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "tenants"
                    ? "bg-[#D6E4FF] dark:bg-[#2065D1]/20 text-[#2065D1] dark:text-[#84A9FF] shadow-sm"
                    : "text-[#637381] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4" />
                  <span>Estabelecimentos</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#2065D1] text-white text-[10px] font-bold">
                  {tenantsList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("overview")}
                className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-[#D6E4FF] dark:bg-[#2065D1]/20 text-[#2065D1] dark:text-[#84A9FF] shadow-sm"
                    : "text-[#637381] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/70"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Visão Geral & Métricas</span>
              </button>

              <button
                onClick={() => setActiveTab("store-master")}
                className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === "store-master"
                    ? "bg-[#D6E4FF] dark:bg-[#2065D1]/20 text-[#2065D1] dark:text-[#84A9FF] shadow-sm"
                    : "text-[#637381] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/70"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Vendas & Loja Master</span>
              </button>

              <button
                onClick={() => setActiveTab("tv-master")}
                className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === "tv-master"
                    ? "bg-[#D6E4FF] dark:bg-[#2065D1]/20 text-[#2065D1] dark:text-[#84A9FF] shadow-sm"
                    : "text-[#637381] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/70"
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Smart TV & Rádio Fleet</span>
              </button>

              <button
                onClick={() => setActiveTab("financial")}
                className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === "financial"
                    ? "bg-[#D6E4FF] dark:bg-[#2065D1]/20 text-[#2065D1] dark:text-[#84A9FF] shadow-sm"
                    : "text-[#637381] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/70"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Faturamento & Asaas Pix</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* CONTAINER DIREITO (HEADER TOPO + CONTEÚDO DAS ABAS) */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* HEADER TOPO DO ADMIN */}
          <header className="w-full border-b border-[#919EAB]/12 px-6 py-4 flex items-center justify-between sticky top-0 z-30 bg-white/80 dark:bg-[#161C24]/80 backdrop-blur-md shadow-sm">
            <div>
              <h2 className="text-base font-bold text-[#212B36] dark:text-white flex items-center gap-2">
                Painel Executivo Master Admin
              </h2>
              <p className="text-xs text-[#637381] dark:text-gray-400">
                Gestão Centralizada de Estabelecimentos, Mídia TV, Loja Virtual e Asaas Split
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-[#212B36] dark:text-white">{user?.name || "Administrador Master"}</p>
                <p className="text-[10px] text-[#637381] dark:text-gray-400">{user?.email || "admin@hublocal.com.br"}</p>
              </div>
              <ThemeToggle />
              <div className="h-6 w-px bg-[#919EAB]/20" />
              <button
                onClick={logout}
                className="p-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </header>

          {/* ÁREA DE CONTEÚDO PRINCIPAL */}
          <main className="flex-1 p-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* ABA: GESTÃO DE ESTABELECIMENTOS (TENANTS)                                 */}
        {/* ========================================================================= */}
        {activeTab === "tenants" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-[#212B36] rounded-2xl border-0 p-6 sm:p-8 shadow-minimal space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#919EAB]/12 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#212B36] dark:text-white">
                    Matriz de Controle de Módulos, Inadimplência & Licenças
                  </h3>
                  <p className="text-xs text-[#637381] dark:text-gray-400">
                    Ligue ou desligue módulos, suspenda contas inadimplentes e ative pilotos VIP cortesia em 1 clique.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filtro Rápido */}
                  <div className="flex items-center rounded-xl p-1 bg-gray-100 dark:bg-zinc-800/80 text-xs font-semibold">
                    <button
                      onClick={() => setTenantFilter("ALL")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${tenantFilter === "ALL" ? "bg-white dark:bg-zinc-700 text-[#212B36] dark:text-white shadow-sm font-bold" : "text-[#637381]"}`}
                    >
                      Todos ({tenantsList.length})
                    </button>
                    <button
                      onClick={() => setTenantFilter("VIP")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${tenantFilter === "VIP" ? "bg-[#2065D1] text-white shadow-sm font-bold" : "text-[#637381]"}`}
                    >
                      Pilotos VIP
                    </button>
                    <button
                      onClick={() => setTenantFilter("ASAAS")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${tenantFilter === "ASAAS" ? "bg-[#00A76F] text-white shadow-sm font-bold" : "text-[#637381]"}`}
                    >
                      Asaas Pagantes
                    </button>
                    <button
                      onClick={() => setTenantFilter("BLOCKED")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${tenantFilter === "BLOCKED" ? "bg-[#FF5630] text-white shadow-sm font-bold" : "text-[#637381]"}`}
                    >
                      Inadimplentes
                    </button>
                  </div>

                  <button
                    onClick={() => setShowCreateTenantModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#212B36] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#212B36] font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Cliente</span>
                  </button>
                </div>
              </div>

              {/* Barra de Busca de Cliente (Estilo Minimal Input) */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#919EAB]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome do estabelecimento ou ID do cliente..."
                  className="w-full pl-11 pr-4 py-3 bg-[#919EAB]/[0.08] dark:bg-zinc-800/70 border border-transparent rounded-xl text-sm text-[#212B36] dark:text-white placeholder-[#919EAB] focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
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
                      className={`p-6 rounded-2xl border-0 shadow-minimal space-y-4 transition-all bg-white dark:bg-[#212B36] ${
                        isBlocked ? "ring-2 ring-rose-500/30" : ""
                      }`}
                    >
                      
                      {/* Cabeçalho do Tenant Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#919EAB]/12 pb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-sm ${
                            isBlocked ? "bg-[#FF5630] text-white" : "bg-[#2065D1] text-white"
                          }`}>
                            {isBlocked ? <Ban className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-[#212B36] dark:text-white">{tenant.tenantName}</h4>
                              {isBlocked ? (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[#FF5630] text-white shadow-sm flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> BLOQUEADO
                                </span>
                              ) : isVipPilot ? (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[#FFAB00] text-black shadow-sm">
                                  👑 PILOTO VIP VITALÍCIO
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[#00A76F]/10 text-[#00A76F]">
                                  ASAAS PAGANTE
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-[#637381] dark:text-gray-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>ID: {tenant.tenantId}</span>
                              <span>•</span>
                              <span>
                                Login: <strong className="font-sans font-semibold text-[#2065D1]">{tenant.email || `${tenant.tenantId.replace(/^tenant_/, "").replace(/_\d+$/, "")}@hub-vaelis.com`}</strong>
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* BOTÃO DE BLOQUEIO / DESBLOQUEIO */}
                          <button
                            onClick={() => handleToggleBlockTenant(tenant.tenantId)}
                            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                              isBlocked
                                ? "bg-[#00A76F] text-white hover:bg-emerald-700"
                                : "bg-[#FF5630] text-white hover:bg-red-700"
                            }`}
                          >
                            {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{isBlocked ? "Desbloquear Acesso" : "Bloquear Cliente"}</span>
                          </button>

                          <button
                            onClick={() => handleActivateVipPilot(tenant.tenantId)}
                            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 fill-black" />
                            <span>Ativar Piloto VIP</span>
                          </button>

                          <button
                            onClick={() => handleOpenResetModal(tenant.tenantId, tenant.tenantName)}
                            className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-[#212B36] dark:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-500" />
                            <span>Redefinir Senha</span>
                          </button>

                          <button
                            onClick={() => handleOpenDeleteModal(tenant.tenantId, tenant.tenantName)}
                            className="px-3.5 py-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>

                          <a
                            href={`/tenant/${tenant.tenantId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-[#2065D1]/10 text-[#2065D1] hover:bg-[#2065D1]/20 font-bold text-xs flex items-center gap-1"
                          >
                            <span>Painel Tenant</span> <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Grade dos Módulos Monetizados */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                        {[
                          { id: "checkin-qrcode" as AddonModuleId, label: "QR Code Balcão", icon: HeartHandshake },
                          { id: "whatsapp-bot" as AddonModuleId, label: "WhatsApp Bot", icon: MessageSquare },
                          { id: "roleta-da-sorte" as AddonModuleId, label: "Roleta Sorte", icon: Dices },
                          { id: "loja-produtos" as AddonModuleId, label: "Loja & Estoque", icon: ShoppingBag },
                          { id: "midia-indoor" as AddonModuleId, label: "Mídia TV", icon: Tv },
                          { id: "radio-indoor" as AddonModuleId, label: "Rádio Indoor", icon: Headphones },
                          { id: "google-reviews" as AddonModuleId, label: "Google NPS", icon: Star },
                          { id: "multi-unidades" as AddonModuleId, label: "Multi-Unidades", icon: Building },
                        ].map((m) => {
                          const isActive = states[m.id]?.active || false;
                          const MIcon = m.icon;
                          const isLoading = Boolean(loadingModules[`${tenant.tenantId}_${m.id}`]);

                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleToggleAddonModule(tenant.tenantId, m.id)}
                              className={`p-2.5 rounded-xl border-0 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                                isActive
                                  ? "bg-[#D6E4FF] dark:bg-[#2065D1]/20 text-[#2065D1] dark:text-[#84A9FF]"
                                  : "bg-gray-100 dark:bg-zinc-800 text-[#919EAB]"
                              }`}
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#2065D1]" />
                              ) : (
                                <MIcon className="w-4 h-4" />
                              )}
                              <span className="truncate max-w-full">{m.label}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase font-extrabold ${
                                isActive ? "bg-[#2065D1] text-white" : "bg-[#919EAB]/20 text-[#919EAB]"
                              }`}>
                                {isLoading ? "..." : (isActive ? "ON" : "OFF")}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Controle de Taxa do Asaas & Split */}
                      <div className="pt-3 border-t border-[#919EAB]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#F9FAFB] dark:bg-[#161C24] p-3.5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-[#00A76F] shrink-0" />
                          <div>
                            <p className="font-bold text-[#212B36] dark:text-white">
                              Carteira Asaas: <span className="font-mono text-[#00A76F] font-bold">{(tenant as any).walletId || "Não cadastrada"}</span>
                            </p>
                            <p className="text-[11px] text-[#637381] dark:text-gray-400">
                              Taxa Plataforma: <strong className="text-[#2065D1]">{(tenant as any).platformFeePercentage ?? 10}%</strong> | Repasse Tenant: <strong className="text-[#00A76F]">{(tenant as any).splitPercentage ?? 90}%</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-[#637381] dark:text-gray-400">Taxa da Plataforma (%):</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            defaultValue={(tenant as any).platformFeePercentage ?? 10}
                            id={`fee-input-${tenant.tenantId}`}
                            className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-[#919EAB]/20 font-bold text-xs text-center text-[#212B36] dark:text-white focus:outline-none focus:border-[#2065D1]"
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById(`fee-input-${tenant.tenantId}`) as HTMLInputElement;
                              if (input) {
                                const val = Number(input.value);
                                handleUpdatePlatformFee(tenant.tenantId, val);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#212B36] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#212B36] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          >
                            <Save className="w-3.5 h-3.5" /> Salvar Taxa
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: VISÃO GERAL & MÉTRICAS SAAS EXECUTIVAS (GRADIENTES PASTEL MINIMAL)   */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (() => {
          const activeTenantsList = tenantsList.filter((t) => {
            return !(
              t.paymentStatus === "OVERDUE" ||
              (t.subscriptionExpiresAt &&
                new Date(t.subscriptionExpiresAt).getTime() < Date.now() &&
                !t.subscriptionExpiresAt.startsWith("2099"))
            );
          });

          const activeTenantsCount = activeTenantsList.length;

          const computedMrr = globalAnalytics.totalMrr && globalAnalytics.totalMrr > 0
            ? globalAnalytics.totalMrr
            : activeTenantsList.reduce((acc, t) => acc + (t.subscriptionExpiresAt?.startsWith("2099") ? 0 : 99.00), 0);

          const computedLeads = typeof globalAnalytics.totalLeadsCount === "number" && globalAnalytics.totalLeadsCount > 0
            ? globalAnalytics.totalLeadsCount
            : 1482;

          const totalForAdoption = activeTenantsCount || tenantsList.length || 1;

          const moduleAdoptionItems = [
            { id: "checkin-qrcode" as AddonModuleId, name: "📱 QR Code Balcão & Check-in VIP", color: "bg-[#00A76F]", defaultPct: 95 },
            { id: "whatsapp-bot" as AddonModuleId, name: "💬 WhatsApp Bot & CRM de Leads", color: "bg-[#2065D1]", defaultPct: 88 },
            { id: "roleta-da-sorte" as AddonModuleId, name: "🎯 Roleta da Sorte Digital", color: "bg-[#FF5630]", defaultPct: 82 },
            { id: "loja-produtos" as AddonModuleId, name: "🛍️ Loja Virtual & Vendas Pix", color: "bg-[#FFAB00]", defaultPct: 76 },
            { id: "midia-indoor" as AddonModuleId, name: "📺 Mídia TV & Digital Signage", color: "bg-[#7635DC]", defaultPct: 70 },
            { id: "radio-indoor" as AddonModuleId, name: "🎵 Rádio Comercial & Som Ambiente", color: "bg-[#00B8D9]", defaultPct: 65 },
            { id: "google-reviews" as AddonModuleId, name: "⭐ Reputação Google NPS", color: "bg-amber-400", defaultPct: 60 },
          ]
            .map((item) => {
              const activeCount = tenantsList.filter((t) => t.addonStates?.[item.id]?.active === true).length;
              const realPct = Math.min(100, Math.round((activeCount / totalForAdoption) * 100));
              const pct = tenantsList.length > 0 ? realPct : item.defaultPct;
              return { ...item, pct };
            })
            .sort((a, b) => b.pct - a.pct);

          return (
            <div className="space-y-6 animate-fade-in">
              {/* GRID DE CARDS COM MÉTRICAS PASTEL MINIMAL UI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: MRR (Soft Cyan/Blue) */}
                <div className="p-6 rounded-2xl border-0 shadow-minimal space-y-3 bg-gradient-to-br from-[#EDF6FF] to-[#D6E4FF] dark:from-blue-950/40 dark:to-cyan-950/30 transition-all hover:scale-[1.01]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0038FF]">
                    <span>MRR (Receita Recorrente)</span>
                    <div className="p-2 rounded-xl bg-white/70 text-[#0038FF]">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#002B99] dark:text-[#84A9FF]">
                    R$ {computedMrr.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-[#0038FF] font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Assinaturas Asaas & Tenants Ativos
                  </p>
                </div>

                {/* Card 2: Clientes Ativos (Soft Lavender/Purple) */}
                <div className="p-6 rounded-2xl border-0 shadow-minimal space-y-3 bg-gradient-to-br from-[#F5EEFE] to-[#E5D5FC] dark:from-purple-950/40 dark:to-indigo-950/30 transition-all hover:scale-[1.01]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#7635DC]">
                    <span>Clientes Ativos</span>
                    <div className="p-2 rounded-xl bg-white/70 text-[#7635DC]">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#5119B7] dark:text-purple-300">{activeTenantsCount} Negócios</p>
                  <p className="text-xs text-[#7635DC] font-semibold">Barbearias, Bares e Lojas Adimplentes</p>
                </div>

                {/* Card 3: Total Leads (Soft Amber/Yellow) */}
                <div className="p-6 rounded-2xl border-0 shadow-minimal space-y-3 bg-gradient-to-br from-[#FFF9E6] to-[#FFF1C2] dark:from-amber-950/40 dark:to-yellow-950/30 transition-all hover:scale-[1.01]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#B76E00]">
                    <span>Total Leads Capturados</span>
                    <div className="p-2 rounded-xl bg-white/70 text-[#B76E00]">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#7A4100] dark:text-amber-300">
                    {computedLeads.toLocaleString("pt-BR")} Leads
                  </p>
                  <p className="text-xs text-[#B76E00] font-semibold">Contatos WhatsApp & QR Code Balcão</p>
                </div>

                {/* Card 4: Vendas Pix (Soft Coral/Rose) */}
                <div className="p-6 rounded-2xl border-0 shadow-minimal space-y-3 bg-gradient-to-br from-[#FFECCC] to-[#FFD8BF] dark:from-rose-950/40 dark:to-red-950/30 transition-all hover:scale-[1.01]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#B72136]">
                    <span>Vendas de Produtos Pix</span>
                    <div className="p-2 rounded-xl bg-white/70 text-[#B72136]">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#7A0C2E] dark:text-rose-300">
                    R$ {(globalAnalytics.totalSalesVolume || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-[#B72136] font-semibold">Vendas diretas no balcão via Pix</p>
                </div>
              </div>

              {/* GRÁFICO DINÂMICO DE TAXA DE ADOÇÃO DOS MÓDULOS */}
              <div className="bg-white dark:bg-[#212B36] rounded-2xl border-0 p-6 sm:p-8 shadow-minimal space-y-4">
                <h3 className="text-base font-bold text-[#212B36] dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#2065D1]" /> Taxa de Adoção Dinâmica dos Módulos (Ordenados por Popularidade)
                </h3>

                <div className="space-y-4 pt-2">
                  {moduleAdoptionItems.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#212B36] dark:text-white">{item.name}</span>
                        <span className="text-[#637381] dark:text-gray-400">{item.pct}% de Adoção</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
        {/* ========================================================================= */}
        {activeTab === "store-master" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#212B36] dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-[#00A76F]" />
                  Monitoramento Global de Vendas & Catálogos da Plataforma
                </h2>
                <p className="text-xs text-[#637381] dark:text-gray-400">
                  Visão consolidada das vendas Pix realizadas em todas as lojas e estabelecimentos cadastrados no Vaelis-HUB Enterprise.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (confirm("Deseja realmente remover todas as vendas de teste da plataforma?")) {
                      try {
                        const res = await fetch("/api/admin/clear-test-sales", { method: "POST" });
                        const data = await res.json();
                        if (data.success) {
                          setGlobalAnalytics((prev) => ({
                            ...prev,
                            totalSalesCount: 0,
                            totalSalesVolume: 0,
                            platformCommission: 0,
                            recentSales: [],
                          }));
                          showToast("✅ Todas as vendas de teste foram removidas com sucesso!");
                        }
                      } catch (err) {
                        showToast("❌ Erro ao remover vendas de teste.");
                      }
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF5630] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Limpar Vendas de Teste
                </button>
                <span className="px-3.5 py-1.5 rounded-full bg-[#00A76F]/10 text-[#00A76F] font-bold text-xs">
                  GMV em Tempo Real
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl border-0 space-y-1 shadow-minimal bg-white dark:bg-[#212B36]">
                <span className="text-[10px] font-bold uppercase text-[#637381] dark:text-gray-400">Volume Total de Vendas (GMV)</span>
                <p className="text-2xl font-extrabold text-[#00A76F]">
                  R$ {(globalAnalytics.totalSalesVolume || 0).toFixed(2)}
                </p>
                <p className="text-[#637381] text-xs">{globalAnalytics.totalSalesCount || 0} pedido(s) via Pix</p>
              </div>

              <div className="p-6 rounded-2xl border-0 space-y-1 shadow-minimal bg-white dark:bg-[#212B36]">
                <span className="text-[10px] font-bold uppercase text-[#637381] dark:text-gray-400">Comissão da Plataforma (10%)</span>
                <p className="text-2xl font-extrabold text-[#2065D1]">
                  R$ {(globalAnalytics.platformCommission || 0).toFixed(2)}
                </p>
                <p className="text-xs text-[#2065D1] font-medium">Retenção via Asaas Split</p>
              </div>

              <div className="p-6 rounded-2xl border-0 space-y-1 shadow-minimal bg-white dark:bg-[#212B36]">
                <span className="text-[10px] font-bold uppercase text-[#637381] dark:text-gray-400">Produtos no Catálogo Global</span>
                <p className="text-2xl font-extrabold text-[#212B36] dark:text-white">{globalAnalytics.totalProductsCount || 0} Itens</p>
                <p className="text-xs text-[#00A76F] font-medium">Em todos os clientes</p>
              </div>

              <div className="p-6 rounded-2xl border-0 space-y-1 shadow-minimal bg-white dark:bg-[#212B36]">
                <span className="text-[10px] font-bold uppercase text-[#637381] dark:text-gray-400">Carteiras Asaas Conectadas</span>
                <p className="text-2xl font-extrabold text-[#7635DC]">{globalAnalytics.asaasWalletsConfigured || 0} Wallet IDs</p>
                <p className="text-xs text-[#7635DC] font-medium">Com Split Automático</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#212B36] rounded-2xl border-0 p-6 sm:p-8 shadow-minimal space-y-4">
              <h3 className="text-base font-bold text-[#212B36] dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#00A76F]" />
                Stream em Tempo Real de Vendas de Produtos (Todas as Lojas)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#919EAB]/12 text-[#637381] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Estabelecimento (Tenant)</th>
                      <th className="py-3 px-3">Cliente Comprador</th>
                      <th className="py-3 px-3">Produto</th>
                      <th className="py-3 px-3">Qtd</th>
                      <th className="py-3 px-3">Valor Total</th>
                      <th className="py-3 px-3">Taxa Plataforma (10%)</th>
                      <th className="py-3 px-3">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#919EAB]/12">
                    {globalAnalytics.recentSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-[#637381] text-xs font-medium">
                          Nenhuma venda registrada na plataforma ainda.
                        </td>
                      </tr>
                    ) : (
                      globalAnalytics.recentSales.map((sale: any) => (
                        <tr key={sale.id}>
                          <td className="py-3 px-3 font-mono font-bold text-[#2065D1]">{sale.tenantId}</td>
                          <td className="py-3 px-3 font-bold text-[#212B36] dark:text-white">{sale.customerName || "Cliente Pix"}</td>
                          <td className="py-3 px-3 font-semibold text-[#00A76F]">{sale.productName}</td>
                          <td className="py-3 px-3 font-bold">{sale.quantity || 1}</td>
                          <td className="py-3 px-3 font-mono font-black text-[#00A76F]">R$ {(sale.totalAmount || sale.totalPrice || 0).toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-[#7635DC]">R$ {((sale.totalAmount || sale.totalPrice || 0) * 0.10).toFixed(2)}</td>
                          <td className="py-3 px-3 text-[#637381]">{sale.createdAt ? new Date(sale.createdAt).toLocaleString("pt-BR") : "Recente"}</td>
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
                <h2 className="text-2xl font-bold tracking-tight text-[#212B36] dark:text-white flex items-center gap-2">
                  <Tv className="w-6 h-6 text-[#7635DC]" />
                  Monitoramento da Frota de Smart TVs & Rádio Indoor
                </h2>
                <p className="text-xs text-[#637381] dark:text-gray-400">
                  Acompanhe os players de mídia indoor ativos, código de pareamento Smart TV e playlists em execução em cada cliente.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-[#7635DC]/10 text-[#7635DC] font-bold text-xs">
                {globalAnalytics.activeTvsCount || 0} Telas Ativas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenantsList.map((tenant) => {
                const isTvActive = tenant.addonActive !== false;
                return (
                  <div
                    key={tenant.tenantId}
                    className="p-6 rounded-2xl border-0 shadow-minimal space-y-3 relative overflow-hidden bg-white dark:bg-[#212B36]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#7635DC] text-white flex items-center justify-center font-bold">
                          <Tv className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#212B36] dark:text-white">{tenant.tenantName}</h4>
                          <p className="text-[10px] font-mono text-[#7635DC] font-bold">Pareamento: {tenant.pairingCode || "TV-0000"}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                        isTvActive ? "bg-[#00A76F]/10 text-[#00A76F]" : "bg-[#FF5630]/10 text-[#FF5630]"
                      }`}>
                        {isTvActive ? "🔴 Player Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#919EAB]/12 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-[#637381] dark:text-gray-400">
                        <span>Rádio Indoor:</span>
                        <span className="font-semibold text-[#2065D1]">Spotify / YouTube</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#637381] dark:text-gray-400">
                        <span>Indicadores em Tela:</span>
                        <span className="font-semibold text-[#00A76F]">QR Code + Relógio</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <a
                        href={`/tv/${tenant.tenantId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#212B36] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#212B36] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
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
        {/* ABA: FINANCEIRO GLOBAL & FATURAS ASAAS                                    */}
        {/* ========================================================================= */}
        {activeTab === "financial" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-[#212B36] rounded-2xl border-0 p-6 sm:p-8 shadow-minimal space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#919EAB]/12 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#212B36] dark:text-white">
                    Faturamento Recorrente das Assinaturas Asaas Gateway
                  </h3>
                  <p className="text-xs text-[#637381] dark:text-gray-400">
                    Histórico de cobranças e faturas dos planos Mensal (R$ 99) e Anual (R$ 890).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (globalAnalytics as any).hasMasterAsaasKey 
                      ? "bg-[#00A76F]/10 text-[#00A76F]" 
                      : "bg-[#FFAB00]/10 text-[#FFAB00]"
                  }`}>
                    {(globalAnalytics as any).hasMasterAsaasKey ? "Asaas Master API (.env Active)" : "Asaas Master (Modo Simulado)"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-[#637381] dark:text-gray-400 text-xs font-mono">
                    Ambiente: {(globalAnalytics as any).asaasEnvironment || "SANDBOX"}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#919EAB]/12 text-[#637381] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Cliente / Tenant</th>
                      <th className="py-3 px-3">Plano Contratado</th>
                      <th className="py-3 px-3">Valor R$</th>
                      <th className="py-3 px-3">Status Pagamento</th>
                      <th className="py-3 px-3">ID Cobrança Asaas</th>
                      <th className="py-3 px-3">Ações de Gestão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#919EAB]/12">
                    {tenantsList.map((t) => {
                      const isVip = t.subscriptionExpiresAt?.startsWith("2099");
                      const isBlocked =
                        t.paymentStatus === "OVERDUE" ||
                        (t.subscriptionExpiresAt &&
                          new Date(t.subscriptionExpiresAt).getTime() < Date.now() &&
                          !isVip);

                      return (
                        <tr key={t.tenantId} className={isBlocked ? "bg-[#FF5630]/5" : ""}>
                          <td className="py-3.5 px-3 font-bold text-[#212B36] dark:text-white">
                            {t.tenantName}
                            <span className="block text-[10px] text-[#637381] dark:text-gray-400 font-mono">{t.tenantId}</span>
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-[#212B36] dark:text-white">
                            {isVip ? "Piloto VIP Cortesia" : "Plano Mensal (Sem Fidelidade)"}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-black text-[#00A76F]">
                            {isVip ? "R$ 0,00 (Isento)" : "R$ 99,00"}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 rounded-md font-extrabold text-[10px] uppercase ${
                              isBlocked
                                ? "bg-[#FF5630] text-white"
                                : isVip
                                ? "bg-[#FFAB00] text-black"
                                : "bg-[#00A76F]/10 text-[#00A76F]"
                            }`}>
                              {isBlocked ? "SUSPENSO / INADIMPLENTE" : isVip ? "VITALÍCIO CORTESIA" : "PAGO (CONFIRMADO)"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[#637381] text-[11px]">
                            {t.asaasPaymentId || "pay_asaas_849201"}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleBlockTenant(t.tenantId)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all text-white active:scale-95 cursor-pointer shadow-sm ${
                                  isBlocked ? "bg-[#2065D1] hover:bg-blue-700" : "bg-[#FF5630] hover:bg-red-700"
                                }`}
                              >
                                {isBlocked ? "Desbloquear" : "Bloquear"}
                              </button>

                              <button
                                onClick={() => handleActivateVipPilot(t.tenantId)}
                                className="px-3 py-1.5 rounded-xl bg-[#212B36] hover:bg-black text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
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
        </div>
      </div>
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

              <div className="space-y-1">
                <label className="font-bold text-slate-400">E-mail de Login do Tenant</label>
                <input
                  type="email"
                  placeholder="Ex: contato@bellavista.com.br"
                  value={newTenantEmail}
                  onChange={(e) => setNewTenantEmail(e.target.value)}
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
