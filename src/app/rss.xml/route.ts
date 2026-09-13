import { client } from '@/lib/tina';
import { parseDate, postSlug, siteUrl, toPostSummaries } from '@/lib/site';

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
      const url = `${base}/posts/${postSlug(post)}`;
      const published = parseDate(post.date);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
${published ? `      <pubDate>${published.toUTCString()}</pubDate>\n` : ''}${post.description ? `      <description>${escapeXml(post.description)}</description>\n` : ''}    </item>`;
    })
    .join('\n');

  // The stylesheet processing instruction must sit between the XML declaration and
  // the root element. Feed readers ignore it; a browser renders /rss.xsl instead of
  // showing a wall of raw XML. Without it, clicking the feed link looks broken.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
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
      /*
       * `application/xml`, deliberately NOT `application/rss+xml`.
       *
       * Chrome treats the feed MIME types (`application/rss+xml`,
       * `application/atom+xml`) as plain text on navigation: `document.contentType`
       * comes back as `text/plain` and the `<?xml-stylesheet?>` instruction is
       * never honoured, so a visitor clicking the feed link sees a wall of raw XML.
       * Measured on a real origin, one content type at a time:
       *
       *   application/rss+xml   -> RAW     (contentType=text/plain)
       *   application/atom+xml  -> RAW     (contentType=text/plain)
       *   application/xml       -> STYLED  (contentType=text/html)
       *   text/xml              -> STYLED  (contentType=text/html)
       *
       * Feed readers parse the document body and accept `application/xml`
       * universally, so nothing is lost on the subscription side.
       */
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
