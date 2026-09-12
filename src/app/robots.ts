import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  let host = base;
  try {
    // The Host directive takes a bare hostname, not a full origin.
    host = new URL(base).host;
  } catch {
    /* keep the raw value if it is not a parseable URL */
  }
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${base}/sitemap.xml`,
    host,
  };
}
