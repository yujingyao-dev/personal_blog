'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { EmptySearch } from '@/components/site/illustrations';
import { useNoMotion } from '@/components/site/use-no-motion';
import { TiltCard } from '@/components/site/tilt-card';

/**
 * The post list with tag filtering.
 *
 * ── Static-site constraints this respects ───────────────────────────────────
 * - **Everything is rendered server-side first.** The page passes the full list
 *   in, the default filter is "全部", so the prerendered HTML contains every
 *   post and every link. Filtering only ever *hides* markup that is already
 *   there, so crawlers and no-JS visitors see the complete list.
 * - **`AnimatePresence initial={false}`** is what keeps that true: without it
 *   every card would mount at `opacity: 0` in the static HTML.
 * - **The shape of the data is flattened on the server** (`slug`, `dateLabel`),
 *   so this file never touches `relativePath` or the generated Tina client. A
 *   client bundle containing those strings fails `check:runtime`.
 */

export type PostListItem = {
  slug: string;
  title: string;
  /** Machine-readable ISO date, for the <time dateTime> attribute. */
  dateIso: string;
  /** Already formatted on the server, so this file needs no date helpers. */
  dateLabel: string;
  description: string | null;
  tags: string[];
};

/**
 * Tag chips cycle through the four accent colours by position, and each chip's
 * hard shadow is the SAME hue as its border — a small detail that makes the row
 * read as a set of coloured stickers rather than four identical pills. The text
 * steps are the darker ones so every chip clears WCAG AA against its own tinted
 * background — see STYLE-DIRECTIONS.md §4.
 */
const TAG_TONES = [
  'border-iris/45 bg-iris/12 text-iris-text shadow-brutal-iris-xs dark:border-iris/40 dark:bg-iris/20 dark:text-indigo-200',
  'border-blush/45 bg-blush/12 text-rose-700 shadow-brutal-blush-xs dark:border-blush/40 dark:bg-blush/20 dark:text-rose-200',
  'border-sun/60 bg-sun/25 text-amber-800 shadow-brutal-sun-xs dark:border-sun/35 dark:bg-sun/15 dark:text-amber-200',
  'border-mint/45 bg-mint/15 text-emerald-800 shadow-brutal-mint-xs dark:border-mint/35 dark:bg-mint/15 dark:text-emerald-200',
] as const;

const ALL = '\u0000all';

export function PostList({ posts, tags }: { posts: PostListItem[]; tags: string[] }) {
  const [activeTag, setActiveTag] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const noMotion = useNoMotion();

  const needle = query.trim().toLowerCase();
  const visible = posts.filter((post) => {
    const matchesTag = activeTag === ALL || post.tags.includes(activeTag);
    const matchesQuery =
      needle === '' ||
      post.title.toLowerCase().includes(needle) ||
      (post.description ?? '').toLowerCase().includes(needle);
    return matchesTag && matchesQuery;
  });

  /*
   * Tone is keyed off the tag's position in the GLOBAL tag list, not its position
   * within whichever array happens to be rendering.
   *
   * Card chips used to use `post.tags[tagIndex]`, so a tag's colour depended on
   * the order it happened to appear in that one post: with tags
   * `['MDX', 'Next.js']` on a post and a global order of
   * `['TinaCMS', 'Next.js', 'MDX']`, "MDX" rendered in one colour in the filter
   * row and another in the card right below it. One post in the demo content
   * makes the orders coincide, which is why this stayed hidden.
   */
  const toneFor = (tag: string) => TAG_TONES[Math.max(0, tags.indexOf(tag)) % TAG_TONES.length];

  /*
   * The empty state needs BOTH controls to exist.
   *
   * With tag chips alone it would be provably unreachable: the tag list is
   * derived from the posts, so selecting any tag necessarily leaves at least the
   * post that contributed it. A search box makes "no results" a real state, and
   * the illustration is used for the search case (no posts at all is handled by
   * the server page, which never renders this component).
   */
  const emptyMessage = needle
    ? '没有匹配的文章，换个关键词试试。'
    : '这个标签下还没有文章。';

  return (
    <>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip selected={activeTag === ALL} onClick={() => setActiveTag(ALL)}>
              全部
            </FilterChip>
            {tags.map((tag) => (
              <FilterChip
                key={tag}
                selected={activeTag === tag}
                tone={toneFor(tag)}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </FilterChip>
            ))}
          </div>
        ) : null}

        <div className="relative shrink-0 sm:w-56">
          <label htmlFor="post-search" className="sr-only">
            搜索文章
          </label>
          <input
            id="post-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题或摘要"
            className="w-full rounded-full border-2 border-ink/85 bg-white/70 py-2 pr-3 pl-9 text-sm font-medium text-ink shadow-brutal-xs backdrop-blur placeholder:text-ink/45 focus:outline-none dark:border-chalk/25 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500 dark:shadow-chalk-xs"
          />
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 stroke-ink/50 dark:stroke-chalk/50"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
        </div>
      </div>

      <m.ul layout className="mt-8 space-y-5">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((post) => (
            <m.li
              key={post.slug}
              layout
              initial={noMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={noMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <TiltCard className="group relative overflow-hidden rounded-blob border-[3px] border-ink/85 bg-white/60 p-6 shadow-brutal backdrop-blur-xl backdrop-saturate-125 transition-shadow duration-300 hover:shadow-brutal-iris motion-reduce:transition-none dark:border-chalk/20 dark:bg-white/[0.04] dark:shadow-chalk dark:hover:shadow-chalk-lg">
                {/* Gradient spine, revealed on hover. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-iris via-blush to-sun opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
                />
                {/* Soft colour wash in the corner keeps the slab from reading flat. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-14 -right-10 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_50%_50%,#6d5cff,transparent_70%)] opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-45 motion-reduce:transition-none"
                />

                <div className="relative">
                  <h2 className="text-title">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="decoration-iris decoration-2 underline-offset-4 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  <time
                    dateTime={post.dateIso}
                    className="mt-2.5 inline-flex items-center rounded-full border border-ink/15 bg-white/70 px-2.5 py-0.5 text-xs font-bold text-ink/75 dark:border-chalk/15 dark:bg-white/[0.06] dark:text-slate-300"
                  >
                    {post.dateLabel}
                  </time>

                  {post.description ? (
                    <p className="mt-3 leading-relaxed text-ink/75 dark:text-slate-300">
                      {post.description}
                    </p>
                  ) : null}

                  {post.tags.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold motion-reduce:shadow-none dark:shadow-chalk-xs ${toneFor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </TiltCard>
            </m.li>
          ))}
        </AnimatePresence>
      </m.ul>

      {/* Empty state for a filter that matches nothing. The "no posts at all"
          case is handled by the server page, which never renders this list. */}
      <AnimatePresence>
        {visible.length === 0 ? (
          <m.div
            initial={noMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6 py-10 text-center"
          >
            <EmptySearch className="h-36 w-auto sm:h-44" />
            <p className="max-w-md leading-relaxed font-medium text-ink/70 dark:text-slate-300">
              {emptyMessage}
            </p>
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function FilterChip({
  selected,
  onClick,
  children,
  tone,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-all duration-200 motion-reduce:transition-none ${
        selected
          ? 'border-ink/85 bg-ink text-paper shadow-brutal-xs dark:border-chalk/40 dark:bg-chalk dark:text-ink dark:shadow-chalk-xs'
          : `${tone ?? 'border-ink/20 bg-white/60 text-ink/70 dark:border-chalk/15 dark:bg-white/[0.04] dark:text-slate-300'} hover:-translate-y-0.5 hover:border-ink/85 motion-reduce:hover:translate-y-0`
      }`}
    >
      {children}
    </button>
  );
}
