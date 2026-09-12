import Link from 'next/link';
import { client } from '@/lib/tina';
import { formatDate, toPostSummaries } from '@/lib/site';

export const revalidate = 60;

export default async function PostsPage() {
  const { data } = await client.queries.postConnection();
  const posts = toPostSummaries(data?.postConnection?.edges);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">文章</h1>

      {posts.length === 0 ? (
        <p className="text-slate-500">还没有文章。进入 /admin/index.html 创建第一篇吧。</p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post.filename}>
              <article>
                <h2 className="text-xl font-semibold">
                  <Link href={`/posts/${post.filename}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <time dateTime={post.date} className="text-sm text-slate-500">
                  {formatDate(post.date)}
                </time>
                {post.description ? (
                  <p className="mt-2 text-slate-600 dark:text-slate-400">{post.description}</p>
                ) : null}
                {post.tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...new Set(post.tags.filter((tag): tag is string => Boolean(tag)))].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      )
                    )}
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
