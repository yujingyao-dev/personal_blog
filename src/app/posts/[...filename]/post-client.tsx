'use client';

import Link from 'next/link';
import { m, useScroll, useSpring } from 'framer-motion';
import { useTina } from 'tinacms/dist/react';
import Body from '@/components/tina-markdown';
import { useNoMotion } from '@/components/site/use-no-motion';
import { formatDate } from '@/lib/site';
import type { PostQuery, PostQueryVariables } from '@/tina/__generated__/types';

/**
 * Client page: `useTina` swaps the sidebar data in while editing, so changes made in the
 * TinaCMS visual editor appear here immediately. In production it just renders `data`.
 *
 * Note: `formatDate` is imported from `@/lib/site` rather than reimplemented here — the
 * shared version pins the timezone to UTC, which this component needs because it runs on
 * the client (see the doc comment on `formatDate`).
 *
 * ── Why there is no frame around the title or the body ──────────────────────
 * Boxing a long article put two nested rectangles between the reader and the
 * text, and the inner scroll of glass made the prose feel cramped. The rule is
 * now: **frames mark widgets (cards, callouts, tabs, code blocks, embeds);
 * page-level prose is unframed.** Readability is instead guaranteed by the
 * central "reading veil" in `src/components/site/backdrop.tsx`, which pins the
 * effective background behind the text column to paper/midnight.
 *
 * Motion split, applied consistently across the site:
 *   - entrance of *content* uses the CSS `animate-rise` utility, so the article is legible
 *     even before hydration and never sits at `opacity: 0` waiting for JavaScript;
 *   - Framer Motion is reserved for interaction/scroll-driven chrome, where JS is already
 *     the thing being driven.
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

  // `useReducedMotion` is not cosmetic here: the spring is exactly the kind of
  // large-area easing that vestibular-sensitive visitors disable. Without it we
  // fall back to the raw scroll value, which still informs without animating.
  // Note this only chooses which MotionValue feeds `scaleX` — both start at 0,
  // so the server and client still render identical markup.
  const noMotion = useNoMotion();
  const { scrollYProgress } = useScroll();
  const smoothed = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 34,
    restDelta: 0.001,
  });
  // `MotionConfig` does not gate MotionValue-driven springs, so the reading
  // progress bar would keep easing on a phone. Fall back to the raw scroll value,
  // which still informs without animating. Both MotionValues start at 0, so the
  // server and client renders agree.
  const progress = noMotion ? scrollYProgress : smoothed;

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:py-16">
      {/* --- Reading progress: a gradient rule pinned to the very top --------- */}
      <m.div
        aria-hidden
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-50 h-1.5 origin-left bg-gradient-to-r from-iris via-blush to-sun print:hidden"
      />

      <article>
        {/* --- Title block (unframed) ----------------------------------------- */}
        <header className="animate-rise">
          <span
            aria-hidden
            className="block h-2 w-24 origin-left animate-rule rounded-full bg-gradient-to-r from-iris via-blush to-sun"
          />

          <h1 className="mt-6 text-headline text-balance sm:text-display">{post.title}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm">
            <time
              dateTime={post.date}
              className="inline-flex items-center rounded-full border-2 border-ink/20 bg-white/70 px-3 py-1 text-xs font-bold text-ink/75 backdrop-blur dark:border-chalk/20 dark:bg-white/[0.06] dark:text-slate-300"
            >
              {formatDate(post.date)}
            </time>

            {post.draft ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-700/60 bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-900 backdrop-blur dark:border-amber-300/40 dark:bg-amber-500/15 dark:text-amber-200">
                <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />
                草稿
              </span>
            ) : null}
          </div>

          {post.description ? (
            <p className="mt-5 text-lg leading-relaxed text-ink/75 dark:text-slate-300">
              {post.description}
            </p>
          ) : null}

          <hr
            aria-hidden
            className="mt-9 h-0.5 border-0 bg-gradient-to-r from-ink/15 via-ink/8 to-transparent dark:from-chalk/20 dark:via-chalk/10"
          />
        </header>

        {/* --- Body: prose straight on the page (unframed) -------------------- */}
        <div className="prose prose-slate mt-9 max-w-none animate-rise dark:prose-invert prose-headings:font-black prose-headings:tracking-tight prose-h1:text-3xl prose-h1:border-b-0 prose-strong:font-black prose-li:marker:text-iris prose-hr:my-10 [animation-delay:120ms]">
          <Body content={post.body} />
        </div>
      </article>

      <p className="mt-14 text-sm">
        <Link
          href="/posts"
          className="group inline-flex items-center gap-2 rounded-full border-2 border-ink/85 bg-white/70 px-4 py-2 font-bold text-ink/75 shadow-brutal-xs backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-sun hover:text-ink hover:shadow-brutal-sm motion-reduce:hover:translate-y-0 dark:border-chalk/25 dark:bg-white/[0.06] dark:text-slate-200 dark:shadow-chalk-xs dark:hover:bg-white/15 dark:hover:text-white"
        >
          {/* Framer Motion drives the arrow nudge: a pure interaction affordance. */}
          <m.span aria-hidden whileHover={{ x: noMotion ? 0 : -4 }} className="inline-block">
            ←
          </m.span>
          返回文章列表
        </Link>
      </p>
    </main>
  );
}
