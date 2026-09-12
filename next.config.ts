import type { NextConfig } from 'next';
import { remotePatternsFromAllowlist } from './src/lib/image-hosts';

/**
 * Vercel exposes `VERCEL_PROJECT_PRODUCTION_URL` on the server only, but `src/lib/site.ts` is
 * also used by the client (via the root layout's `metadataBase`). Re-export it under a
 * NEXT_PUBLIC_ name so both sides resolve the same origin; without this the client falls back to
 * localhost and the server/client metadata disagree.
 */
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??=
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
}

const nextConfig: NextConfig = {
  images: {
    // Derived from ALLOWED_IMAGE_HOSTS (src/lib/image-hosts.ts) so the optimizer's rules and
    // the component's check cannot disagree — a mismatch produces broken images with no error.
    remotePatterns: remotePatternsFromAllowlist().map((pattern) => ({
      protocol: 'https' as const,
      hostname: pattern.hostname,
    })),
  },
};

export default nextConfig;
