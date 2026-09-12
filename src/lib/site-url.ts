/**
 * Absolute site origin, used for metadata (canonical URLs, Open Graph) and for
 * sitemap / robots / RSS.
 *
 * `NEXT_PUBLIC_` is required, not stylistic: this module is imported by `src/app/layout.tsx`,
 * which is a client component, and Next only inlines `NEXT_PUBLIC_*` variables into the browser
 * bundle. Reading a server-only name here would yield `undefined` on the client and produce a
 * different `metadataBase` than the server rendered — the same class of bug as the timezone
 * hydration mismatch fixed elsewhere.
 *
 * Resolution order:
 *  1. `NEXT_PUBLIC_SITE_URL` — set explicitly (required for a custom domain)
 *  2. `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` — must be re-exported as a public variable
 *     because Vercel's own `VERCEL_PROJECT_PRODUCTION_URL` is not exposed to the browser
 *  3. localhost, for local development
 */
import { siteUrl as resolveSiteUrl } from '@/lib/site';

export function metadataBaseUrl(): URL {
  return new URL(resolveSiteUrl());
}
