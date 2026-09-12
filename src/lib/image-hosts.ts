/**
 * Decides whether a content-authored remote image may go through the Next.js image optimizer.
 *
 * The check must agree with Next.js, because a mismatch is silent: the page renders 200 while
 * the optimizer answers `400 "url" parameter is not allowed` and the image is broken.
 *
 * `images.remotePatterns` hostnames are matched with picomatch, which compiles the hostname as a
 * glob. The semantics are easy to get wrong by hand — for example `**.vercel.app` DOES match
 * `my-blog.vercel.app` and `a.b.vercel.app` but does NOT match the bare `vercel.app`. Every
 * expectation below was verified against picomatch directly (`next/dist/compiled/picomatch`),
 * and `scripts/unit-image-hosts.mjs` locks them in.
 *
 * Next's own matcher is deliberately not imported here: `next/dist/...` is not a public entry
 * point and does not resolve reliably at runtime (a dynamic import without `.js` fails outright
 * under Node ESM). One verified implementation is more trustworthy than a fast path that may
 * silently fall through.
 *
 * Keeping this module free of `next.config.ts` imports lets a client component use it.
 */

/** Hosts whose images are optimized. `next.config.ts` builds `remotePatterns` from this list. */
export const ALLOWED_IMAGE_HOSTS = ['assets.tina.io', '**.vercel.app'];

export type RemotePattern = {
  protocol?: string;
  hostname: string;
  port?: string;
  pathname?: string;
  search?: string;
};

/**
 * Glob match with the subset of picomatch behaviour that hostnames actually use:
 * `**` and `*` match any run of characters (including dots), other characters are literal.
 *
 * `**` is therefore not treated as "one or more labels" — picomatch resolves `**.vercel.app`
 * against `my-blog.vercel.app` as true, which is the behaviour Next applies.
 */
function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\?]/g, '\\$&');
  // `**` and `*` both become a catch-all. Longest token first so `**` is not read as two `*`.
  const body = escaped.replace(/\*\*/g, '\u0000').replace(/\*/g, '\u0001');
  const pattern = body.split('\u0000').join('[\\s\\S]*').split('\u0001').join('[\\s\\S]*');
  return new RegExp(`^${pattern}$`, 'i');
}

/** Does `url` match this remote pattern? Mirrors `matchRemotePattern` in Next. */
export function matchesRemotePattern(pattern: RemotePattern, url: URL): boolean {
  if (pattern.protocol !== undefined) {
    if (pattern.protocol.replace(/:$/, '') !== url.protocol.replace(/:$/, '')) return false;
  }
  if (pattern.port !== undefined && pattern.port !== url.port) return false;
  if (!globToRegExp(pattern.hostname).test(url.hostname)) return false;
  if (pattern.search !== undefined && pattern.search !== url.search) return false;
  if (!globToRegExp(pattern.pathname ?? '**').test(url.pathname)) return false;
  return true;
}

/** The `remotePatterns` entries this module implies, for `next.config.ts`. */
export function remotePatternsFromAllowlist(): RemotePattern[] {
  return ALLOWED_IMAGE_HOSTS.map((hostname) => ({ protocol: 'https', hostname }));
}

/** Would the optimizer accept this URL? */
export function isUrlAllowedForOptimizer(url: URL): boolean {
  return remotePatternsFromAllowlist().some((pattern) => matchesRemotePattern(pattern, url));
}

/** Convenience wrapper for a bare hostname. */
export function isAllowedImageHost(hostname: string): boolean {
  try {
    return isUrlAllowedForOptimizer(new URL(`https://${hostname}/`));
  } catch {
    return false;
  }
}
