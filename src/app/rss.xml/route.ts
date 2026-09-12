import { client } from '@/lib/tina';
import { parseDate, siteUrl, toPostSummaries } from '@/lib/site';

export const revalidate = 60;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const base = siteUrl();
  const { data } = await client.queries.postConnection();
  const posts = toPostSummaries(data?.postConnection?.edges);

  const items = posts
    .map((post) => {
      const url = `${base}/posts/${post.relativePath.replace(/\.mdx?$/, '')}`;
      const published = parseDate(post.date);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
${published ? `      <pubDate>${published.toUTCString()}</pubDate>\n` : ''}${post.description ? `      <description>${escapeXml(post.description)}</description>\n` : ''}    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>我的博客</title>
    <link>${base}</link>
    <description>一个用 TinaCMS + Next.js 构建的静态个人博客</description>
    <language>zh-CN</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
