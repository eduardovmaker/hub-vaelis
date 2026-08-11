import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Vaelis-HUB — Plataforma Omnichannel de Engajamento, Mídia Indoor & Captive Portal",
  description: "Solução enterprise para estabelecimentos comércios e redes: Mídia Indoor TV, Rádio Comercial sem anúncios, Automação de Avaliações 5★ no Google e Captive Portal Wi-Fi de Alta Performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme="light">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
