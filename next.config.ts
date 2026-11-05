import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // On ignore les erreurs de type pour la compilation mobile si besoin
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
