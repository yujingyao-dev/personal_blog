import { EmptyBox } from '@/components/site/illustrations';
import { PostList, type PostListItem } from '@/components/posts/post-list';
import { client } from '@/lib/tina';
import { formatDate, postSlug, toPostSummaries } from '@/lib/site';

export const revalidate = 60;

export default async function PostsPage() {
  const { data } = await client.queries.postConnection();
  const posts = toPostSummaries(data?.postConnection?.edges);

  /*
   * Flattened on the server before crossing into the client component, for two
   * reasons:
   *   - the slug and the display date are derived here (via `postSlug` /
   *     `formatDate`), so the client bundle does not need `@/lib/site` at all;
   *   - `PostSummary.relativePath` must never reach a client file, or
   *     `check:runtime` fails the build.
   */
  const items: PostListItem[] = posts.map((post) => ({
    slug: postSlug(post),
    title: post.title,
    dateIso: post.date,
    dateLabel: formatDate(post.date),
    description: post.description,
    tags: [...new Set(post.tags?.filter((tag): tag is string => Boolean(tag)) ?? [])],
  }));

  // Derived from the FULL list, not from the filtered one — otherwise selecting a
  // tag would make every other tag chip disappear.
  const tags = [...new Set(items.flatMap((post) => post.tags))];

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-14 sm:py-16">
      {/* --- Page header ------------------------------------------------------ */}
      <header className="animate-rise">
        <h1 className="relative inline-block text-headline">
          文章
          <span
            aria-hidden
            className="absolute -bottom-2 left-0 block h-2 w-full origin-left animate-rule rounded-full bg-gradient-to-r from-iris via-blush to-sun"
          />
        </h1>
        {/* Decorative geometry echoing the home hero, without adding copy. */}
        <div aria-hidden className="mt-7 flex items-center gap-2">
          <span className="h-2.5 w-16 rounded-full bg-iris/70" />
          <span className="h-2.5 w-9 rounded-full bg-blush/70" />
          <span className="h-2.5 w-24 rounded-full bg-sun/80" />
          <span className="h-3.5 w-3.5 rotate-12 rounded-[4px] bg-mint/70" />
        </div>
      </header>

      {items.length === 0 ? (
        <div className="mt-10 flex animate-rise flex-col items-center gap-6 py-8 text-center">
          <EmptyBox className="h-40 w-auto sm:h-48" />
          <p className="max-w-md leading-relaxed font-medium text-ink/70 dark:text-slate-300">
            还没有文章。进入 /admin/index.html 创建第一篇吧。
          </p>
        </div>
      ) : (
        <PostList posts={items} tags={tags} />
      )}
    </main>
  );
}
