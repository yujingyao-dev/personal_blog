'use client';

import Link from 'next/link';
import { useTina } from 'tinacms/dist/react';
import Body from '@/components/tina-markdown';
import type { PostQuery, PostQueryVariables } from '@/tina/__generated__/types';

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Client page: `useTina` swaps the sidebar data in while editing, so changes made in the
 * TinaCMS visual editor appear here immediately. In production it just renders `data`.
 */
export default function PostClient(props: {
  query: string;
  variables: PostQueryVariables;
  data: PostQuery;
}) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });

  const post = data.post;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            {post.draft ? (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                草稿
              </span>
            ) : null}
          </div>
          {post.description ? (
            <p className="mt-3 text-slate-600 dark:text-slate-400">{post.description}</p>
          ) : null}
        </header>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <Body content={post.body} />
        </div>
      </article>

      <p className="mt-12 text-sm">
        <Link href="/posts" className="text-sky-600 hover:underline dark:text-sky-400">
          ← 返回文章列表
        </Link>
      </p>
    </main>
  );
}
