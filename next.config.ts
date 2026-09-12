import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // TinaCloud media assets
      { protocol: 'https', hostname: 'assets.tina.io' },
      // Vercel preview/deployment domains
      { protocol: 'https', hostname: '**.vercel.app' },
    ],
  },
};

export default nextConfig;
