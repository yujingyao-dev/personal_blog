import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PostClient from './post-client';
import { client } from '@/lib/tina';
import { parseDate } from '@/lib/site';

/**
 * Catch-all (`[...filename]`) rather than a single segment (`[filename]`), so posts in
 * subfolders work: `content/posts/2026/new-post.mdx` is served at `/posts/2026/new-post`.
 * With a single segment Next encodes the slash as `%2F` when prerendering
 * (`/posts/2026%2Fnested-post`), which never matches the URL the lists and sitemap emit.
 */
type Params = { filename: string[] };

/** Kept in sync with the root layout; a page-level openGraph replaces it rather than merging. */
const SITE_NAME = '我的博客';

/**
 * Revalidate so an edit to a published post actually reaches the article page.
 * Without this the page keeps its build-time HTML until the next deploy, while the list
 * and home page (both revalidate=60) already show the new title — the classic
 * "the list updated but the article didn't" confusion.
 */
export const revalidate = 60;

/** Route segments -> the path used to look the document up in the collection. */
function toRelativePath(segments: string[]) {
  const slug = segments.join('/');
  return slug.endsWith('.mdx') || slug.endsWith('.md') ? slug : `${slug}.mdx`;
}

function isPublished(node: { draft: boolean | null } | null | undefined) {
  return Boolean(node) && !node?.draft;
}

/**
 * Pre-render every published post as static HTML at build time.
 *
 * Uses `_sys.relativePath` (not `filename`, which is only the basename) so subfolders
 * resolve, and excludes drafts so `draft: true` really does unpublish a post rather than
 * only hiding it from lists.
 */
export async function generateStaticParams(): Promise<Params[]> {
  const { data } = await client.queries.postConnection();
  return (data?.postConnection?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => isPublished(node))
    .map((node) => ({
      filename: node._sys.relativePath.replace(/\.mdx?$/, '').split('/'),
    }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { filename } = await params;
  const relativePath = toRelativePath(filename);

  try {
    // The client uses errorPolicy: 'include' (see src/lib/tina.ts), so a missing document
    // resolves to a null post instead of rejecting.
    const { data } = await client.queries.post({ relativePath });
    if (!isPublished(data?.post)) return { title: '文章未找到' };

    const post = data.post;
    const description = post.description ?? undefined;

    return {
      title: post.title,
      description,
      // Without openGraph the shared link has no title/description/image at all, and without
      // the image a share renders as a bare URL. The canonical URL is resolved against the
      // site origin because a relative og:url is not usable by most crawlers.
      alternates: { canonical: `/posts/${filename.join('/')}` },
      openGraph: {
        type: 'article',
        // Repeated from the root layout on purpose: a page-level `openGraph` object replaces the
        // layout's rather than deep-merging, so omitting siteName here drops og:site_name.
        siteName: SITE_NAME,
        title: post.title,
        description,
        url: `/posts/${filename.join('/')}`,
        publishedTime: parseDate(post.date)?.toISOString(),
        images: post.cover ? [{ url: post.cover, alt: post.title }] : undefined,
      },
      twitter: {
        card: post.cover ? 'summary_large_image' : 'summary',
        title: post.title,
        description,
        images: post.cover ? [post.cover] : undefined,
      },
    };
  } catch {
    // A transport-level failure (offline, DNS) must not be reported as "not found".
    return { title: '文章暂时无法加载' };
  }
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { filename } = await params;
  const relativePath = toRelativePath(filename);

  let result: Awaited<ReturnType<typeof client.queries.post>>;
  try {
    result = await client.queries.post({ relativePath });
  } catch (error) {
    // Only transport failures land here. They must surface as errors rather than being
    // baked in as a permanent 404 for a post that exists.
    console.error(`Failed to load post "${relativePath}":`, error);
    throw error;
  }

  // A missing record resolves with a null post (errorPolicy: 'include'); a draft must not be
  // publicly reachable.
  if (!isPublished(result.data?.post)) notFound();

  // Pass the generated query + variables alongside the data so the client page can
  // re-fetch and live-update inside the TinaCMS visual editor.
  return <PostClient query={result.query} variables={result.variables} data={result.data} />;
}
