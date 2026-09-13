import Link from 'next/link';
import { EmptyBox, SparkleCluster } from '@/components/site/illustrations';
import { TiltCard } from '@/components/site/tilt-card';
import { client } from '@/lib/tina';
import { formatDate, postSlug, toPostSummaries } from '@/lib/site';

export const revalidate = 60;

/**
 * Static stagger delays, indexed by list position.
 *
 * Expressed as Tailwind arbitrary properties rather than an inline
 * `style={{ animationDelay }}` so that the whole entrance cascade stays in
 * classNames, and so the delay is emitted by the same CSS layer that owns the
 * `--animate-rise` keyframes.
 */
const STAGGER = [
  '[animation-delay:0ms]',
  '[animation-delay:80ms]',
  '[animation-delay:160ms]',
  '[animation-delay:240ms]',
  '[animation-delay:320ms]',
  '[animation-delay:400ms]',
] as const;

export default async function HomePage() {
  const { data } = await client.queries.postConnection();
  const posts = toPostSummaries(data?.postConnection?.edges).slice(0, 3);

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-14 sm:py-20">
      {/* --- Hero: a frosted slab bordered in ink ------------------------------ */}
      <section className="relative isolate animate-rise overflow-hidden rounded-blob border-[3px] border-ink/85 bg-white/60 p-7 shadow-brutal-lg backdrop-blur-xl backdrop-brightness-105 backdrop-saturate-150 sm:p-10 dark:border-chalk/20 dark:bg-white/[0.04] dark:shadow-chalk-lg">
        {/* Soft gradient geometry tucked into the corners of the slab. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-[conic-gradient(from_140deg,#6d5cff,#ff6b9d,#ffd166)] opacity-35 blur-2xl"
        />

        <div className="relative sm:flex sm:items-start sm:justify-between sm:gap-8">
          <div className="sm:max-w-xl">
            {/* An animated highlighter rule instead of an added eyebrow label. */}
            <span
              aria-hidden
              className="mb-6 block h-2 w-24 origin-left animate-rule rounded-full bg-gradient-to-r from-iris via-blush to-sun"
            />

            <h1 className="text-headline text-balance sm:text-display">你好，欢迎来到我的博客</h1>

            <p className="mt-5 text-lg leading-relaxed text-ink/75 dark:text-slate-300">
              这里记录我的技术笔记与思考。内容由 TinaCMS 管理，站点是纯静态的 Next.js 应用。
            </p>
          </div>

          {/* Illustration: the shape family, gathered into one sticker. */}
          <SparkleCluster className="mt-8 h-24 w-auto shrink-0 animate-bob max-md:animate-none sm:mt-2 sm:h-32" />
        </div>

        <div className="relative mt-8 flex flex-wrap items-center gap-2" aria-hidden>
          <span className="h-2.5 w-14 rounded-full bg-iris/70" />
          <span className="h-2.5 w-8 rounded-full bg-blush/70" />
          <span className="h-2.5 w-20 rounded-full bg-sun/80" />
          <span className="h-2.5 w-6 rounded-full bg-mint/70" />
        </div>
      </section>

      {/* --- Latest posts ----------------------------------------------------- */}
      <section className="mt-16">
        <div className="mb-7 flex items-baseline justify-between gap-4">
          <h2 className="relative text-title">
            最新文章
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-0 block h-1.5 w-full origin-left animate-rule rounded-full bg-gradient-to-r from-iris via-blush to-sun"
            />
          </h2>
          <Link
            href="/posts"
            className="shrink-0 rounded-full border-2 border-ink/85 bg-white/70 px-3.5 py-1.5 text-sm font-bold shadow-brutal-xs backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-sun hover:shadow-brutal-sm motion-reduce:hover:translate-y-0 dark:border-chalk/25 dark:bg-white/[0.06] dark:shadow-chalk-xs dark:hover:bg-white/15"
          >
            全部文章 →
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="flex animate-rise flex-col items-center gap-6 py-8 text-center">
            <EmptyBox className="h-40 w-auto sm:h-48" />
            <p className="max-w-md leading-relaxed font-medium text-ink/70 dark:text-slate-300">
              还没有文章。
            </p>
          </div>
        ) : (
          /*
            Mobile: a horizontal snap carousel of "ticket" cards, so the three
            latest posts occupy one screen instead of pushing everything else
            below the fold. Desktop keeps the vertical stack.

            `gap-4` and `space-y-4` coexist on purpose — `gap` only applies to
            flex/grid containers, so it is inert once `md:block` takes over, and
            vice versa. The negative margin lets the carousel bleed to the screen
            edge while the page keeps its gutters.
          */
          <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 max-md:-mx-4 max-md:px-4 md:block md:space-y-4 md:overflow-visible md:pb-0">
            {posts.map((post, index) => (
              <li
                key={post.relativePath}
                className={`animate-rise max-md:w-[82%] max-md:shrink-0 max-md:snap-center md:w-auto ${STAGGER[index % STAGGER.length]}`}
              >
                <TiltCard className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-[3px] border-ink/85 bg-white/60 p-5 shadow-brutal backdrop-blur-xl backdrop-saturate-125 transition-shadow duration-300 hover:shadow-brutal-iris motion-reduce:transition-none dark:border-chalk/20 dark:bg-white/[0.04] dark:shadow-chalk dark:hover:shadow-chalk-lg">
                  {/* Gradient spine, revealed on hover. */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-iris via-blush to-sun opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />

                  <h3 className="text-lg font-bold tracking-tight">
                    <Link
                      href={`/posts/${postSlug(post)}`}
                      className="decoration-iris decoration-2 underline-offset-4 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </h3>

                  {post.description ? (
                    <p className="mt-3 leading-relaxed text-ink/75 dark:text-slate-300">
                      {post.description}
                    </p>
                  ) : null}

                  {/* Perforation + stub: the ticket read. `mt-auto` pushes the
                      stub to the bottom so cards of unequal height still line up
                      along the tear line. */}
                  <div
                    aria-hidden
                    className="mt-auto border-t-2 border-dashed border-ink/25 dark:border-chalk/25"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <time
                      dateTime={post.date}
                      className="inline-flex items-center rounded-full border border-ink/15 bg-white/70 px-2.5 py-0.5 text-xs font-bold text-ink/75 dark:border-chalk/15 dark:bg-white/[0.06] dark:text-slate-300"
                    >
                      {formatDate(post.date)}
                    </time>
                  </div>
                </TiltCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
