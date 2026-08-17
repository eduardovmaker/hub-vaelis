"use client";

import { use, useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Check, 
  Copy, 
  RefreshCw, 
  ArrowLeft, 
  Store, 
  AlertCircle, 
  CreditCard,
  CheckCircle2,
  Package
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

  const [products, setProducts] = useState<Product[]>([]);
  const [tenantName, setTenantName] = useState<string>(
    tenantId.replace(/^tenant_/, "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");

  // Estado do Modal de Checkout
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [pixResult, setPixResult] = useState<{
    saleId: string;
    pixQrCodeImage: string;
    pixCopyPaste: string;
    paymentId: string;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

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

  const categories = ["TODOS", ...Array.from(new Set(products.map((p) => p.category || "Geral")))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "TODOS" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenBuyModal = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setPixResult(null);
    setIsPaidSuccess(false);
  };

  const handleExecuteCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsProcessingCheckout(true);
    try {
      const res = await fetch("/api/checkout/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          productId: selectedProduct.id,
          customerName: customerName || "Cliente Balcão",
          customerEmail: customerEmail || `cliente_${Date.now()}@loja.vaelis.com.br`,
          customerCpf: customerCpf || undefined,
          quantity,
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

        // Dar baixa no estoque da loja
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
        alert(data.error || "Erro ao processar checkout via Asaas Pix.");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* HEADER DA LOJA */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                {tenantName}
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase border border-emerald-500/30">
                  Loja Oficial
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">E-Commerce & Vendas Instantâneas via Pix</p>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* BANNER DE BOAS VINDAS */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold text-xs inline-flex items-center gap-1 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" /> Pagamento Instantâneo sem Filas
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">Catálogo de Produtos & Bebidas</h2>
            <p className="text-xs text-slate-400">
              Escolha seu produto, pague via QR Code Pix no Asaas com liberação imediata e retire com a equipe.
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Store className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        {/* CONTROLES DE BUSCA E CATEGORIA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produtos pelo nome ou descrição..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {/* FILTRO DE CATEGORIAS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
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
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-bold">Carregando catálogo da loja...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800/60 p-8">
            <Package className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Nenhum produto encontrado</h3>
            <p className="text-xs text-slate-500">Tente buscar por outro termo ou selecione a categoria "TODOS".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-slate-900 rounded-3xl border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 shadow-md group"
              >
                <div>
                  <div className="h-44 w-full bg-slate-950 relative overflow-hidden">
                    <img
                      src={
                        product.imageUrl ||
                        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80"
                      }
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-extrabold text-emerald-400 uppercase">
                      {product.category || "Geral"}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Preço Pix</span>
                    <p className="text-lg font-black text-emerald-400">R$ {product.price.toFixed(2)}</p>
                  </div>

                  {product.stockQty > 0 ? (
                    <button
                      onClick={() => handleOpenBuyModal(product)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      <ShoppingBag className="w-4 h-4" /> Comprar
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-rose-400 font-bold text-xs">
                      Esgotado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER DA LOJA */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 {tenantName} • Plataforma Vaelis-HUB com Gateway Asaas Pix</p>
      </footer>

      {/* MODAL DE CHECKOUT DA COMPRA */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Checkout de Compra Pix
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                ✕ Fechar
              </button>
            </div>

            {!pixResult ? (
              <form onSubmit={handleExecuteCheckout} className="space-y-4">
                {/* RESUMO DO PRODUTO */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <img
                    src={
                      selectedProduct.imageUrl ||
                      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={selectedProduct.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">{selectedProduct.name}</h4>
                    <p className="text-xs text-emerald-400 font-extrabold">R$ {selectedProduct.price.toFixed(2)} / un</p>
                  </div>
                  <div className="flex items-center gap-2 border border-slate-800 rounded-xl p-1 bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-6 h-6 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(selectedProduct.stockQty, quantity + 1))}
                      className="w-6 h-6 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu Nome Completo *"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Seu E-mail (Opcional)"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Total a Pagar via Pix:</span>
                  <span className="text-lg font-black text-emerald-400">
                    R$ {(selectedProduct.price * quantity).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingCheckout}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  {isProcessingCheckout ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Gerando QR Code Asaas...
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
                <div className="p-4 rounded-2xl bg-white w-52 h-52 mx-auto border flex items-center justify-center shadow-inner">
                  {pixResult.pixQrCodeImage ? (
                    <img
                      src={
                        pixResult.pixQrCodeImage.startsWith("data:") || pixResult.pixQrCodeImage.startsWith("http")
                          ? pixResult.pixQrCodeImage
                          : `data:image/png;base64,${pixResult.pixQrCodeImage}`
                      }
                      alt="QR Code Pix Asaas"
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixResult.pixCopyPaste)}`}
                      alt="QR Code Pix Asaas"
                      className="w-44 h-44 object-contain"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={copyPixCode}
                    className="w-full py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 transition-all"
                  >
                    {copiedPix ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPix ? "Pix Copiado!" : "Copiar Chave Pix Copia e Cola"}</span>
                  </button>

                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                    <span>Aguardando pagamento Pix no seu app do banco...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
