"use client";

import { useState, useEffect } from "react";
import { Coupon, DiscountType } from "@/types/coupon";
import { 
  Tag, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  Calendar, 
  Sparkles, 
  Search, 
  Percent, 
  DollarSign, 
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpRight
} from "lucide-react";

interface CouponManagementProps {
  tenantId: string;
}

export function CouponManagement({ tenantId }: CouponManagementProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, [tenantId]);

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/coupons`);
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons || []);
      } else {
        setError(data.error || "Falha ao carregar cupons.");
      }
    } catch (err) {
      setError("Erro de conexão ao carregar cupons.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/tenant/${tenantId}/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          discountValue: Number(discountValue),
          maxUses: maxUses ? Number(maxUses) : null,
          expirationDate: expirationDate || null,
          isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Cupom de desconto criado com sucesso!");
        setCoupons([data.coupon, ...coupons]);
        setIsModalOpen(false);
        resetForm();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(data.error || "Erro ao criar cupom.");
      }
    } catch (err) {
      setError("Erro ao se conectar ao servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const newActiveState = !coupon.isActive;
    
    // Otimistic update
    setCoupons((prev) =>
      prev.map((c) => (c.id === coupon.id ? { ...c, isActive: newActiveState } : c))
    );

    try {
      const res = await fetch(`/api/tenant/${tenantId}/coupons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponId: coupon.id,
          isActive: newActiveState,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        // Reverter se falhar
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: coupon.isActive } : c))
        );
        setError("Não foi possível alterar o status do cupom.");
      }
    } catch (err) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: coupon.isActive } : c))
      );
      setError("Erro de rede ao atualizar o cupom.");
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom de desconto?")) return;

    try {
      const res = await fetch(`/api/tenant/${tenantId}/coupons?couponId=${couponId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== couponId));
        setSuccessMsg("Cupom excluído com sucesso!");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.error || "Erro ao excluir cupom.");
      }
    } catch (err) {
      setError("Erro ao se comunicar com o servidor.");
    }
  };

  const resetForm = () => {
    setCode("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("");
    setMaxUses("");
    setExpirationDate("");
    setIsActive(true);
  };

  const generateRandomCode = () => {
    const prefixes = ["PROMO", "VIP", "OFERTA", "SUPER", "VAELIS", "DESCONTO"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}${num}`);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtragem
  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Estatísticas
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.isActive).length;
  const totalUses = coupons.reduce((acc, curr) => acc + (curr.usedCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header com Design System Minimal Kit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Gerenciamento de Cupons
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                Marketing & Vendas
              </span>
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Crie códigos promocionais para impulsionar as conversões no checkout via Pix e Roleta da Sorte.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Criar Novo Cupom
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Cupons</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalCoupons}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cupons Ativos</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{activeCoupons}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Usos Totais</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalUses} resgates</p>
        </div>
      </div>

      {/* Alertas de Notificação */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Busca e Barra de Ferramentas */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por código (ex: VIP10)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <button
          onClick={fetchCoupons}
          title="Atualizar lista"
          className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Lista de Cupons em Grid/Cards Estilo Minimal Kit */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Carregando cupons da loja...
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center border border-zinc-200/80 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-4">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {searchQuery ? "Nenhum cupom encontrado" : "Nenhum cupom cadastrado ainda"}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
            {searchQuery
              ? "Tente buscar com outro código ou limpe os filtros."
              : "Crie cupons promocionais para seus clientes aplicarem no checkout do Pix."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Cupom
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const isExpired =
              coupon.expirationDate && new Date(coupon.expirationDate) < new Date();
            const isMaxedOut =
              coupon.maxUses !== null &&
              coupon.maxUses !== undefined &&
              coupon.usedCount >= coupon.maxUses;

            return (
              <div
                key={coupon.id}
                className={`bg-white dark:bg-zinc-900 rounded-2xl border p-5 transition-all relative flex flex-col justify-between ${
                  !coupon.isActive || isExpired || isMaxedOut
                    ? "border-zinc-200 dark:border-zinc-800 opacity-75"
                    : "border-zinc-200/90 dark:border-zinc-800 hover:border-blue-500/50 shadow-sm hover:shadow-md"
                }`}
              >
                <div>
                  {/* Top Header do Card */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold tracking-wider text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(coupon.code, coupon.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                        title="Copiar código"
                      >
                        {copiedId === coupon.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {!coupon.isActive ? (
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                          Inativo
                        </span>
                      ) : isExpired ? (
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                          Expirado
                        </span>
                      ) : isMaxedOut ? (
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                          Esgotado
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          Ativo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valor do Desconto */}
                  <div className="mb-4">
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400 flex items-baseline gap-1">
                      {coupon.discountType === "PERCENTAGE" ? (
                        <>
                          {coupon.discountValue}% <span className="text-sm font-semibold text-zinc-500">OFF</span>
                        </>
                      ) : (
                        <>
                          R$ {coupon.discountValue.toFixed(2)} <span className="text-sm font-semibold text-zinc-500">OFF</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Meta Informações */}
                  <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                    <div className="flex items-center justify-between">
                      <span>Usos efetuados:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : "utilizações"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Expira em:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {coupon.expirationDate
                          ? new Date(coupon.expirationDate).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "Sem expiração"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer com Ações */}
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 mt-4">
                  <button
                    onClick={() => handleToggleStatus(coupon)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      coupon.isActive
                        ? "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100"
                    }`}
                  >
                    {coupon.isActive ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Desativar
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativar
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                    title="Excluir cupom"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação de Cupom - Minimal Kit Style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Criar Novo Cupom
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              {/* Código do Cupom */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Código Promocional
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="EX: VIP10"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 py-2 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Gerar
                  </button>
                </div>
              </div>

              {/* Tipo de Desconto e Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tipo de Desconto
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="PERCENTAGE">Porcentagem (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Valor {discountType === "PERCENTAGE" ? "(%)" : "(R$)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder={discountType === "PERCENTAGE" ? "10" : "15.00"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Limite de Usos e Expiração */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Máximo de Usos <span className="text-zinc-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 50"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Validade <span className="text-zinc-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Checkbox Ativo */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Ativar cupom imediatamente após a criação
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? "Criando..." : "Salvar Cupom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
