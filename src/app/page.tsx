import Link from 'next/link';
import { client } from '@/lib/tina';
import { formatDate, toPostSummaries } from '@/lib/site';

export const revalidate = 60;

export default async function HomePage() {
  const { data } = await client.queries.postConnection();
  const posts = toPostSummaries(data?.postConnection?.edges).slice(0, 3);

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <section>
        <h1 className="text-4xl font-bold tracking-tight">你好，欢迎来到我的博客</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          这里记录我的技术笔记与思考。内容由 TinaCMS 管理，站点是纯静态的 Next.js 应用。
        </p>
      </section>

      <section className="mt-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">最新文章</h2>
          <Link href="/posts" className="text-sm text-sky-600 hover:underline dark:text-sky-400">
            全部文章 →
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className="text-slate-500">还没有文章。</p>
        ) : (
          <ul className="space-y-6">
            {posts.map((post) => (
              <li key={post.filename}>
                <h3 className="text-lg font-medium">
                  <Link href={`/posts/${post.filename}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h3>
                <time dateTime={post.date} className="text-sm text-slate-500">
                  {formatDate(post.date)}
                </time>
                {post.description ? (
                  <p className="mt-1 text-slate-600 dark:text-slate-400">{post.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
