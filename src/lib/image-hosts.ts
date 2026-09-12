/**
 * Single source of truth for the hosts whose images may be fetched through the Next.js image
 * optimizer.
 *
 * Shared deliberately: `next.config.ts` builds `images.remotePatterns` from this list, and
 * `src/components/mdx/figure.tsx` (a client component) uses it to decide whether a
 * content-authored remote URL can go through `next/image`. Without that check the page still
 * renders 200 while the image is broken — the optimizer answers
 * `400 "url" parameter is not allowed` for a host that is not listed here.
 *
 * It lives in its own module so the client bundle never imports `next.config.ts`.
 *
 * Add a host here when you start embedding images from a new source.
 */
export const ALLOWED_IMAGE_HOSTS = ['assets.tina.io', '**.vercel.app'];

/** Does `hostname` match any entry in ALLOWED_IMAGE_HOSTS? `**.foo` also matches subdomains. */
export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_IMAGE_HOSTS.some((pattern) => {
    const rule = pattern.toLowerCase();
    if (rule.startsWith('**.')) {
      const base = rule.slice(3);
      return host === base || host.endsWith(`.${base}`);
    }
    if (rule.startsWith('*.')) {
      const base = rule.slice(2);
      return host.endsWith(`.${base}`);
    }
    return host === rule;
  });
}
