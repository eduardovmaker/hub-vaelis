import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = (req.headers.get("host") || "").toLowerCase();

  // 1. Ignorar arquivos estáticos, assets, favicon, API routes e build traces
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/static") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Rotas explícitas do sistema SaaS (Login, Admin, Checkout, Tenant, TV, Portal, Checkin, Roleta)
  // Essas rotas NUNCA devem ser reescritas para o portal de cliente customizado
  const isSystemRoute =
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/checkout") ||
    url.pathname.startsWith("/tenant") ||
    url.pathname.startsWith("/portal") ||
    url.pathname.startsWith("/tv") ||
    url.pathname.startsWith("/checkin") ||
    url.pathname.startsWith("/roleta");

  if (isSystemRoute) {
    return NextResponse.next();
  }

  // 3. Verificação de domínios da plataforma (Vercel, Localhost, Hub Vaelis, CaptiveHub)
  const isPlatformDomain =
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    hostname.includes("vercel.app") ||
    hostname.includes("hub-vaelis") ||
    hostname.includes("seusaas.com") ||
    hostname.includes("captivehub.com");

  if (isPlatformDomain) {
    return NextResponse.next();
  }

  // 4. 🌐 DOMÍNIO PERSONALIZADO DE TENANT (Ex: tv.restaurantedosilva.com.br ou wifi.barber.com.br)
  if (hostname.startsWith("tv.") || url.pathname.startsWith("/tv")) {
    return NextResponse.rewrite(new URL(`/tv/custom_domain`, req.url));
  }

  // Caso seja o portal Wi-Fi em um domínio externo customizado de cliente
  return NextResponse.rewrite(new URL(`/portal/custom_domain`, req.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
