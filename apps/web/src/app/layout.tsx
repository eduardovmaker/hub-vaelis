import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Vaelis Indoor — Mídia Indoor para Smart TVs",
  description:
    "Plataforma de mídia indoor: playlists de vídeo hospedadas no Cloudflare R2 e trilha sonora do Spotify tocando direto na tela do estabelecimento.",
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
