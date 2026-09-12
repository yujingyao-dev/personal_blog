import type { Metadata } from 'next';
import Body from '@/components/tina-markdown';
import { client } from '@/tina/__generated__/client';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { data } = await client.queries.page({ relativePath: 'about.mdx' });
    return { title: data.page.title };
  } catch {
    return { title: '关于' };
  }
}

export default async function AboutPage() {
  const { data } = await client.queries.page({ relativePath: 'about.mdx' });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <Body content={data.page.body} />
      </div>
    </main>
  );
}
