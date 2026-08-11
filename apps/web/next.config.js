/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite body size maior para uploads de arquivos via API routes
  experimental: {
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
};

module.exports = nextConfig;
