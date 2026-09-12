import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PostClient from './post-client';
import { client } from '@/lib/tina';

type Params = { filename: string };

/**
 * Revalidate so an edit to a published post actually reaches the article page.
 * Without this the page keeps its build-time HTML until the next deploy, while the list
 * and home page (both revalidate=60) already show the new title — the classic
 * "the list updated but the article didn't" confusion.
 */
export const revalidate = 60;

/** Editor-authored URLs use the full path within the collection, so nested posts work. */
function toRelativePath(filename: string) {
  return filename.endsWith('.mdx') || filename.endsWith('.md') ? filename : `${filename}.mdx`;
}

function isPublished(node: { draft: boolean | null } | null | undefined) {
  return Boolean(node) && !node?.draft;
}

/**
 * Pre-render every published post as static HTML at build time.
 *
 * Uses `_sys.relativePath` (not `filename`) so posts organised in subfolders such as
 * `content/posts/2026/new-post.mdx` resolve, and drafts are excluded so `draft: true`
 * really does unpublish a post instead of only hiding it from lists.
 */
export async function generateStaticParams(): Promise<Params[]> {
  const { data } = await client.queries.postConnection();
  return (data?.postConnection?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => isPublished(node))
    .map((node) => ({ filename: node._sys.relativePath.replace(/\.mdx?$/, '') }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { filename } = await params;

  try {
    // The client uses errorPolicy: 'include' (see src/lib/tina.ts), so a missing document
    // resolves to a null post instead of rejecting.
    const { data } = await client.queries.post({ relativePath: toRelativePath(filename) });
    if (!isPublished(data?.post)) return { title: '文章未找到' };
    return {
      title: data.post.title,
      description: data.post.description ?? undefined,
    };
  } catch {
    // A transport-level failure (offline, DNS) must not be reported as "not found".
    return { title: '文章暂时无法加载' };
  }
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { filename } = await params;

  let result: Awaited<ReturnType<typeof client.queries.post>>;
  try {
    result = await client.queries.post({ relativePath: toRelativePath(filename) });
  } catch (error) {
    // Only transport failures land here. They must surface as errors rather than being
    // baked in as a permanent 404 for a post that exists.
    console.error(`Failed to load post "${filename}":`, error);
    throw error;
  }

  // A missing record resolves with a null post (errorPolicy: 'include'); a draft must not be
  // publicly reachable.
  if (!isPublished(result.data?.post)) notFound();

  // Pass the generated query + variables alongside the data so the client page can
  // re-fetch and live-update inside the TinaCMS visual editor.
  return <PostClient query={result.query} variables={result.variables} data={result.data} />;
}
