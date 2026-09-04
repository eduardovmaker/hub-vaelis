import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * O único redirecionamento por domínio que a plataforma precisa: um
 * subdomínio dedicado do cliente (ex: tv.barbearia.com.br) cai direto na
 * tela de pareamento do player, para a TV abrir sempre no mesmo endereço.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = (req.headers.get("host") || "").toLowerCase();

  if (pathname !== "/") return NextResponse.next();

  if (hostname.startsWith("tv.")) {
    return NextResponse.rewrite(new URL("/tv", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
