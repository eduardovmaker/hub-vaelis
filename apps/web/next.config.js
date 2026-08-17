/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite body size maior para uploads de arquivos via API routes
  experimental: {
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      ...(process.env.NEXT_PUBLIC_R2_DOMAIN
        ? [
            {
              protocol: "https",
              hostname: process.env.NEXT_PUBLIC_R2_DOMAIN.replace(/^https?:\/\//, ""),
            },
          ]
        : []),
    ],
  },
};

module.exports = nextConfig;
