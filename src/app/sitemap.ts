import type { MetadataRoute } from 'next';
import { client } from '@/tina/__generated__/client';
import { siteUrl, toPostSummaries } from '@/lib/site';

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { data } = await client.queries.postConnection();
  const posts = toPostSummaries(data?.postConnection?.edges);

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/posts`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.4 },
    ...posts.map((post) => ({
      url: `${base}/posts/${post.filename}`,
      lastModified: post.date ? new Date(post.date) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
