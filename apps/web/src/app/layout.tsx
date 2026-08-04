import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "HubLocal - Plataforma de Engajamento, Mídia & Gestão para Estabelecimentos",
  description: "Soluções completas para estabelecimentos e comércios encantarem clientes com Mídia TV Indoor, Rádio Comercial, Avaliações 5★ no Google, WhatsApp Bot e Módulo Wi-Fi Captive Portal.",
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
