import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // Ignorar arquivos estáticos, rotas internas do Next (_next), favicon, api, etc.
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/static") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Se for o domínio principal da sua plataforma (ex: app.seusaas.com, vercel.app ou localhost)
  if (
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    hostname.includes("vercel.app") ||
    hostname.includes("hub-vaelis") ||
    hostname.includes("seusaas.com") ||
    hostname.includes("captivehub.com")
  ) {
    return NextResponse.next();
  }

  // 🌐 DOMÍNIO PERSONALIZADO DE TENANT (Ex: tv.restaurantedosilva.com.br ou wifi.barber.com.br)
  // Caso o subdomínio comece com 'tv.' ou o caminho for para Mídia Indoor
  if (hostname.startsWith("tv.") || url.pathname.startsWith("/tv")) {
    // Redireciona a requisição mantendo a URL personalizada na barra do navegador do cliente
    return NextResponse.rewrite(new URL(`/tv/custom_domain`, req.url));
  }

  // Caso seja o portal Wi-Fi / Captive Portal no domínio customizado
  return NextResponse.rewrite(new URL(`/portal/custom_domain`, req.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
