import type { MetadataRoute } from 'next';
import { client } from '@/lib/tina';
import { parseDate, siteUrl, toPostSummaries } from '@/lib/site';

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { data } = await client.queries.postConnection();
  const posts = toPostSummaries(data?.postConnection?.edges);

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/posts`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.4 },
    ...posts.map((post) => {
      // Only pass lastModified when the date actually parses: Next calls toISOString() on
      // it, so a single malformed frontmatter date (e.g. 2026-02-30) would otherwise fail
      // the whole build with an error pointing at the sitemap instead of the post.
      const lastModified = parseDate(post.date);
      return {
        url: `${base}/posts/${post.relativePath.replace(/\.mdx?$/, '')}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    }),
  ];
}
