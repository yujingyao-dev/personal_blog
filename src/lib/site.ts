/** Absolute site origin, used by sitemap/robots/RSS. */
export function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    'http://localhost:3000';

  return raw.replace(/\/+$/, '');
}

export function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export type PostSummary = {
  title: string;
  date: string;
  description: string | null;
  tags: (string | null)[] | null;
  filename: string;
};

export function toPostSummaries(
  edges: ({ node: { title: string; date: string; description: string | null; tags: (string | null)[] | null; draft: boolean | null; _sys: { filename: string } } | null } | null)[] | null | undefined
): PostSummary[] {
  return (edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .filter((node) => !node.draft)
    .map((node) => ({
      title: node.title,
      date: node.date,
      description: node.description,
      tags: node.tags,
      filename: node._sys.filename,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
