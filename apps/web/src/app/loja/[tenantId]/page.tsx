"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Check, 
  Copy, 
  RefreshCw, 
  Store, 
  CreditCard,
  Package,
  Sun,
  Moon,
  Tag,
  Zap
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQty: number;
  description?: string;
  imageUrl?: string;
  active?: boolean;
}

export default function TenantPublicStorePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  const searchParams = useSearchParams();

  // Fase 3: Captura de cupom via Query Parameter (?coupon=ROLETA-XXXXX)
  const urlCoupon = searchParams.get("coupon") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [tenantName, setTenantName] = useState<string>(
    tenantId.replace(/^tenant_/, "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");

  // Estado do Tema (Light / Dark Mode com Persistência)
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("store_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("store_theme", nextTheme);
  };

  // Estado do Modal de Checkout
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");

  // Estado de Cupom de Desconto no Checkout
  const [couponInput, setCouponInput] = useState(urlCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    calculatedDiscount: number;
    finalTotal: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [pixResult, setPixResult] = useState<{
    saleId: string;
    pixQrCodeImage: string;
    pixCopyPaste: string;
    paymentId: string;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Carregar dados da loja pública
  useEffect(() => {
    async function loadStoreData() {
      try {
        setIsLoading(true);
        const [prodRes, portalRes] = await Promise.all([
          fetch(`/api/tenant/${tenantId}/products`),
          fetch(`/api/portal/${tenantId}`),
        ]);

        const prodData = await prodRes.json();
        if (prodData.success && Array.isArray(prodData.products)) {
          setProducts(prodData.products.filter((p: Product) => p.active !== false));
        }

        const portalData = await portalRes.json();
        if (portalData.success && portalData.portalConfig?.tenantName) {
          setTenantName(portalData.portalConfig.tenantName);
        }
      } catch (err) {
        console.error("Erro ao carregar dados da loja pública:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoreData();
  }, [tenantId]);

  // FASE 3: Auto-Validação Instantânea do Cupom ao abrir modal ou alterar produto/quantidade
  useEffect(() => {
    if (!selectedProduct) return;

    const targetCoupon = couponInput.trim() || urlCoupon.trim();
    if (!targetCoupon) return;

    const baseAmount = selectedProduct.price * quantity;
    setIsValidatingCoupon(true);

    fetch(
      `/api/checkout/validate-coupon?tenantId=${tenantId}&code=${encodeURIComponent(targetCoupon)}&amount=${baseAmount}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.coupon) {
          setAppliedCoupon(data.coupon);
          setCouponInput(targetCoupon);
          setCouponError(null);
        } else {
          setAppliedCoupon(null);
          setCouponError(data.message || "Cupom inválido.");
        }
      })
      .catch((err) => {
        console.error("Erro ao auto-validar cupom:", err);
        setCouponError("Erro ao validar cupom.");
      })
      .finally(() => {
        setIsValidatingCoupon(false);
      });
  }, [selectedProduct, quantity, urlCoupon, tenantId]);

  const categories = ["TODOS", ...Array.from(new Set(products.map((p) => p.category || "Geral")))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "TODOS" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  };

  const cleanCpfDigits = customerCpf.replace(/\D/g, "");
  const isCpfCnpjValid = cleanCpfDigits.length === 11 || cleanCpfDigits.length === 14;

  // Estado para controlar a exibição do campo de cupom no modal (só abre se clicar em 'Possui cupom?')
  const [showCouponInput, setShowCouponInput] = useState(Boolean(urlCoupon));

  const handleOpenBuyModal = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setPixResult(null);
    setCouponError(null);
    if (urlCoupon) {
      setCouponInput(urlCoupon);
      setShowCouponInput(true);
    } else {
      setShowCouponInput(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!selectedProduct || !couponInput.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    const baseAmount = selectedProduct.price * quantity;

    try {
      const res = await fetch(
        `/api/checkout/validate-coupon?tenantId=${tenantId}&code=${encodeURIComponent(couponInput)}&amount=${baseAmount}`
      );
      const data = await res.json();
      if (data.valid && data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(data.message || "Cupom inválido.");
      }
    } catch (err) {
      setCouponError("Erro ao validar cupom.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleExecuteCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!isCpfCnpjValid) {
      alert("Por favor, preencha um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const res = await fetch("/api/checkout/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productPrice: selectedProduct.price,
          customerName: customerName || "Cliente Balcão",
          customerEmail: customerEmail || `cliente_${Date.now()}@loja.vaelis.com.br`,
          cpfCnpj: customerCpf,
          customerCpf: customerCpf,
          quantity,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.asaas) {
        setPixResult({
          saleId: data.saleId,
          pixQrCodeImage: data.asaas.pixQrCodeImage || "",
          pixCopyPaste: data.asaas.pixCopyPaste || "",
          paymentId: data.asaas.paymentId,
        });

        try {
          await fetch(`/api/tenant/${tenantId}/products`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: selectedProduct.id,
              deltaStock: -quantity,
            }),
          });
        } catch (stockErr) {}
      } else {
        alert(data.error || "Erro ao processar checkout via Pix.");
      }
    } catch (err) {
      console.error("Erro no checkout:", err);
      alert("Falha de conexão com a loja. Tente novamente.");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const copyPixCode = () => {
    if (pixResult?.pixCopyPaste) {
      navigator.clipboard.writeText(pixResult.pixCopyPaste);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-[#F9FAFB] dark:bg-[#161C24] transition-colors duration-200 font-sans overflow-x-hidden">
      {/* Background Soft Aura Gradient (Minimal UI Kit) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/50 via-indigo-50/30 to-transparent dark:from-blue-900/10 dark:via-transparent pointer-events-none rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-sky-100/40 via-purple-50/20 to-transparent dark:from-purple-950/10 dark:via-transparent pointer-events-none rounded-full blur-3xl -z-10 transform -translate-x-1/3 translate-y-1/3" />

      {/* HEADER DA LOJA (MINIMAL GLASSMORPHISM) */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#161C24]/80 backdrop-blur-md border-0 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00A76F] flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/20">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#212B36] dark:text-white flex items-center gap-2">
                {tenantName}
                <span className="px-2.5 py-0.5 rounded-md bg-[#00A76F]/10 text-[#00A76F] text-[10px] font-extrabold uppercase">
                  Loja Oficial
                </span>
              </h1>
              <p className="text-xs text-[#637381] dark:text-gray-400">
                E-Commerce & Vendas Instantâneas via Pix
              </p>
            </div>
          </div>

          {/* BOTÃO THEME TOGGLE */}
          <button
            onClick={toggleTheme}
            aria-label="Alternar Tema Sol/Lua"
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-[#212B36] dark:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#212B36]" />
                <span className="hidden sm:inline">Modo Escuro</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 z-10">
        
        {/* BANNER AVISO DE CUPOM ATIVO DA ROLETA */}
        {urlCoupon && (
          <div className="p-4 rounded-2xl bg-[#00A76F] text-white shadow-minimal flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-300" /> Cupom de Desconto Ativado!
                </p>
                <p className="text-sm font-semibold">
                  Seu cupom <span className="font-mono font-bold underline text-amber-200">{urlCoupon}</span> será aplicado no checkout!
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase">
              Desconto Garantido
            </span>
          </div>
        )}

        {/* BANNER DE BOAS VINDAS (PASTEL MINT MINIMAL UI) */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#E6F4EA] to-[#D4EDDA] dark:from-emerald-950/40 dark:to-teal-950/30 border-0 shadow-minimal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-[#00A76F]/10 text-[#00A76F] font-bold text-xs inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Pagamento Instantâneo sem Filas
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#004D40] dark:text-emerald-200">
              Catálogo de Produtos & Bebidas
            </h2>
            <p className="text-xs text-[#00695C] dark:text-emerald-400">
              Escolha seu produto, pague via QR Code Pix com liberação imediata e retire com a equipe.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center shrink-0 shadow-sm">
            <Store className="w-7 h-7 text-[#00A76F]" />
          </div>
        </div>

        {/* CONTROLES DE BUSCA E CATEGORIA (ESTILO MINIMAL INPUT) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#919EAB]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produtos pelo nome ou descrição..."
              className="w-full pl-11 pr-4 py-3 bg-[#919EAB]/[0.08] dark:bg-zinc-800/70 border border-transparent rounded-xl text-sm text-[#212B36] dark:text-white placeholder-[#919EAB] focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
            />
          </div>

          {/* FILTRO DE CATEGORIAS (MINIMAL PILLS) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#00A76F] text-white shadow-sm"
                    : "bg-white dark:bg-[#212B36] text-[#637381] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-sm"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* LISTAGEM DE PRODUTOS */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#00A76F] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#637381] dark:text-gray-400">
              Carregando catálogo da loja...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white dark:bg-[#212B36] rounded-2xl border-0 p-8 shadow-minimal">
            <Package className="w-10 h-10 text-[#919EAB] mx-auto" />
            <h3 className="text-sm font-bold text-[#212B36] dark:text-white">
              Nenhum produto encontrado
            </h3>
            <p className="text-xs text-[#637381] dark:text-gray-400">
              Tente buscar por outro termo ou selecione a categoria "TODOS".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, idx) => (
              <div
                key={product.id}
                className="bg-white dark:bg-[#212B36] rounded-2xl border-0 overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-minimal hover:shadow-minimal-hover group"
              >
                <div>
                  {/* Imagem do Produto sem padding (encostada nas bordas) */}
                  <div className="h-56 w-full relative overflow-hidden bg-gray-100 dark:bg-zinc-800">
                    <img
                      src={
                        product.imageUrl ||
                        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80"
                      }
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Badges Flutuantes sobrepostas no canto superior direito */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {idx % 2 === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-[#FF5630] text-white font-extrabold text-[10px] uppercase shadow-sm tracking-wider">
                          SALE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md bg-[#00B8D9] text-white font-extrabold text-[10px] uppercase shadow-sm tracking-wider">
                          NEW
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white font-extrabold text-[10px] uppercase tracking-wider">
                        {product.category || "Geral"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-1.5">
                    <h3 className="text-sm font-bold text-[#212B36] dark:text-white group-hover:text-[#2065D1] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-[#637381] dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#637381] dark:text-gray-400 block">
                      Preço Pix
                    </span>
                    <p className="text-base font-extrabold text-[#212B36] dark:text-white">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </div>

                  {product.stockQty > 0 ? (
                    <button
                      onClick={() => handleOpenBuyModal(product)}
                      className="px-4 py-2.5 rounded-xl bg-[#212B36] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#212B36] font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" /> Comprar
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl font-bold text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      Esgotado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER WHITE-LABEL DA LOJA */}
      <footer className="border-t border-[#919EAB]/12 py-6 px-4 text-center text-xs text-[#637381] dark:text-gray-400">
        <p>© {new Date().getFullYear()} {tenantName}. Todos os direitos reservados.</p>
      </footer>

      {/* MODAL DE CHECKOUT DA COMPRA (MINIMAL UI DIALOG) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#212B36] rounded-2xl border-0 p-6 sm:p-8 max-w-md w-full space-y-5 shadow-minimal-dialog animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#919EAB]/12 pb-4">
              <h3 className="text-base font-bold text-[#212B36] dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#00A76F]" />
                Checkout de Compra Pix
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-xs font-bold text-[#637381] hover:text-[#212B36] dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            {!pixResult ? (
              <form onSubmit={handleExecuteCheckout} className="space-y-4">
                {/* RESUMO DO PRODUTO */}
                <div className="p-4 rounded-2xl bg-[#F9FAFB] dark:bg-[#161C24] flex items-center gap-3 border border-[#919EAB]/12">
                  <img
                    src={
                      selectedProduct.imageUrl ||
                      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={selectedProduct.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#212B36] dark:text-white">
                      {selectedProduct.name}
                    </h4>
                    <p className="text-xs text-[#00A76F] font-extrabold">R$ {selectedProduct.price.toFixed(2)} / un</p>
                  </div>
                  <div className="flex items-center gap-2 border border-[#919EAB]/20 rounded-xl p-1 bg-white dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-6 h-6 rounded-lg font-bold flex items-center justify-center bg-gray-100 dark:bg-zinc-700 text-[#212B36] dark:text-white cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(selectedProduct.stockQty, quantity + 1))}
                      className="w-6 h-6 rounded-lg font-bold flex items-center justify-center bg-gray-100 dark:bg-zinc-700 text-[#212B36] dark:text-white cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu Nome Completo *"
                    className="w-full px-4 py-3 bg-[#919EAB]/[0.08] dark:bg-zinc-800/70 border border-transparent rounded-xl text-sm text-[#212B36] dark:text-white placeholder-[#919EAB] focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                  />
                  <div>
                    <input
                      type="text"
                      required
                      value={customerCpf}
                      onChange={(e) => setCustomerCpf(formatCpfCnpj(e.target.value))}
                      placeholder="CPF ou CNPJ (Obrigatório) *"
                      maxLength={18}
                      className={`w-full px-4 py-3 bg-[#919EAB]/[0.08] dark:bg-zinc-800/70 border border-transparent rounded-xl text-sm text-[#212B36] dark:text-white placeholder-[#919EAB] focus:outline-none focus:border-gray-400 focus:bg-white transition-all ${
                        cleanCpfDigits.length > 0 && !isCpfCnpjValid ? "border-rose-500 focus:border-rose-500" : ""
                      }`}
                    />
                    {cleanCpfDigits.length > 0 && !isCpfCnpjValid && (
                      <span className="text-[10px] text-rose-500 mt-1 block font-semibold">
                        Insira 11 números para CPF ou 14 para CNPJ ({cleanCpfDigits.length}/11 ou 14)
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Seu E-mail (Opcional)"
                    className="w-full px-4 py-3 bg-[#919EAB]/[0.08] dark:bg-zinc-800/70 border border-transparent rounded-xl text-sm text-[#212B36] dark:text-white placeholder-[#919EAB] focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                  />
                </div>

                {/* CAMPO DE CUPOM DE DESCONTO: REQUISITO DO USUÁRIO
                    Só exibe o input se o usuário clicar no link 'Possui cupom de desconto?' (ou se já tiver cupom aplicado) */}
                <div className="space-y-2 pt-1">
                  {!showCouponInput && !appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => setShowCouponInput(true)}
                      className="text-xs font-semibold text-[#2065D1] dark:text-[#84A9FF] hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Possui cupom de desconto?</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="block text-xs font-bold text-[#637381] dark:text-gray-400">
                        Cupom de Desconto:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="EX: ROLETA-A8F9B"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            if (appliedCoupon) setAppliedCoupon(null);
                          }}
                          className="flex-1 px-4 py-2.5 bg-[#919EAB]/[0.08] dark:bg-zinc-800/70 border border-transparent rounded-xl text-xs font-mono uppercase tracking-wider text-[#212B36] dark:text-white placeholder-[#919EAB] focus:outline-none focus:border-gray-400"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={isValidatingCoupon || !couponInput.trim()}
                          className="px-4 py-2.5 rounded-xl bg-[#2065D1] hover:bg-blue-700 text-white font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          {isValidatingCoupon ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[11px] text-rose-500 font-semibold">{couponError}</p>
                      )}
                      {appliedCoupon && (
                        <p className="text-[11px] text-[#00A76F] font-semibold flex items-center gap-1 animate-fade-in">
                          <Check className="w-3.5 h-3.5 text-[#00A76F]" /> Cupom <strong className="font-mono bg-[#00A76F]/10 px-1.5 py-0.5 rounded text-[#00A76F]">{appliedCoupon.code}</strong> aplicado com sucesso!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* RESUMO DO TOTAL COM DESCONTO */}
                <div className="p-4 rounded-2xl bg-[#00A76F]/10 border border-[#00A76F]/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#637381] dark:text-gray-400 font-medium">Subtotal Original:</span>
                    <span className={`font-semibold ${appliedCoupon ? "line-through text-slate-500" : "text-[#212B36] dark:text-white"}`}>
                      R$ {(selectedProduct.price * quantity).toFixed(2)}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-xs text-[#00A76F] font-bold">
                      <span>Desconto Aplicado ({appliedCoupon.code}):</span>
                      <span>- R$ {appliedCoupon.calculatedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-[#00A76F]/20">
                    <span className="text-xs font-bold text-[#212B36] dark:text-white">
                      Total a Pagar via Pix:
                    </span>
                    <span className="text-lg font-extrabold text-[#00A76F]">
                      R$ {(appliedCoupon ? appliedCoupon.finalTotal : selectedProduct.price * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingCheckout || !customerName.trim() || !isCpfCnpjValid}
                  className="w-full py-3.5 rounded-xl bg-[#2065D1] hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
                >
                  {isProcessingCheckout ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Gerando QR Code Pix...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" /> Gerar QR Code Pix para Pagamento
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-2xl bg-white w-52 h-52 mx-auto border border-[#919EAB]/20 flex items-center justify-center shadow-sm">
                  <img
                    src={
                      pixResult.pixQrCodeImage && pixResult.pixQrCodeImage.length > 20
                        ? pixResult.pixQrCodeImage.startsWith("data:") || pixResult.pixQrCodeImage.startsWith("http")
                          ? pixResult.pixQrCodeImage
                          : `data:image/png;base64,${pixResult.pixQrCodeImage}`
                        : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixResult.pixCopyPaste)}`
                    }
                    alt="QR Code Pix"
                    className="w-44 h-44 object-contain"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    onClick={copyPixCode}
                    className="w-full py-3 rounded-xl border border-[#00A76F]/30 text-xs font-bold flex items-center justify-center gap-2 bg-[#00A76F]/10 text-[#00A76F] hover:bg-[#00A76F]/20 transition-all cursor-pointer"
                  >
                    {copiedPix ? <Check className="w-4 h-4 text-[#00A76F]" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPix ? "Pix Copiado!" : "Copiar Chave Pix Copia e Cola"}</span>
                  </button>

                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                    <span>Aguardando pagamento Pix no seu app do banco...</span>
                  </div>

                  <a
                    href={`/nps/${tenantId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm mt-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-black" />
                    <span>⭐ Avalie nosso atendimento no Google</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
