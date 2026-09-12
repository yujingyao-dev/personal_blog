import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Body from '@/components/tina-markdown';
import { client } from '@/lib/tina';

export const revalidate = 60;

const ABOUT_PATH = 'about.mdx';

async function loadAbout() {
  const { data } = await client.queries.page({ relativePath: ABOUT_PATH });
  return data?.page ?? null;
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await loadAbout();
    return { title: page?.title ?? '关于' };
  } catch {
    return { title: '关于' };
  }
}

export default async function AboutPage() {
  // The page collection allows renaming/deleting files, so this document may legitimately
  // not exist. Render a 404 instead of crashing with an unhandled error, and let genuine
  // query failures surface rather than being masked as "not found".
  let page: Awaited<ReturnType<typeof loadAbout>>;
  try {
    page = await loadAbout();
  } catch (error) {
    console.error('Failed to load the about page:', error);
    throw error;
  }

  if (!page) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <Body content={page.body} />
      </div>
    </main>
  );
}
