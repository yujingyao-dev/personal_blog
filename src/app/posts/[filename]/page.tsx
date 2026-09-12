import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PostClient from './post-client';
import { client } from '@/tina/__generated__/client';

type Params = { filename: string };

function toRelativePath(filename: string) {
  const decoded = decodeURIComponent(filename);
  return decoded.endsWith('.mdx') || decoded.endsWith('.md') ? decoded : `${decoded}.mdx`;
}

/**
 * Pre-render every post as static HTML at build time.
 * Next.js requires each param value to be a string, so posts live at
 * /posts/<slug> (a single dynamic segment).
 */
export async function generateStaticParams(): Promise<Params[]> {
  const { data } = await client.queries.postConnection();
  return (data?.postConnection?.edges ?? [])
    .map((edge) => edge?.node?._sys)
    .filter((sys): sys is NonNullable<typeof sys> => Boolean(sys))
    .map((sys) => ({ filename: sys.filename }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { filename } = await params;

  try {
    const { data } = await client.queries.post({ relativePath: toRelativePath(filename) });
    return {
      title: data.post.title,
      description: data.post.description ?? undefined,
    };
  } catch {
    return { title: '文章未找到' };
  }
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { filename } = await params;
  const relativePath = toRelativePath(filename);

  let result: Awaited<ReturnType<typeof client.queries.post>>;
  try {
    result = await client.queries.post({ relativePath });
  } catch {
    notFound();
  }

  if (!result.data?.post) notFound();

  // Pass the generated query + variables alongside the data so the client page can
  // re-fetch and live-update inside the TinaCMS visual editor.
  return <PostClient query={result.query} variables={result.variables} data={result.data} />;
}
