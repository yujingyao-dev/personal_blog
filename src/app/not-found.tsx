import Link from 'next/link';
import { LostPlane } from '@/components/site/illustrations';

/**
 * The 404 page.
 *
 * Before this existed, `/_not-found` was served with Next's unstyled default —
 * the one route on the site that did not speak the design language at all.
 *
 * `metadata` is deliberately NOT exported here: `not-found.tsx` has historically
 * not been a supported place for it, and the root layout already supplies the
 * site title and description. Getting a "404" into the browser tab is not worth
 * a build that depends on that behaviour.
 *
 * Layout follows the same rule as article/about bodies: content is NOT wrapped
 * in a frame (see STYLE-DIRECTIONS.md D5). Only widgets and list cards get one.
 */
export default function NotFound() {
  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="animate-rise">
        <LostPlane className="h-40 w-auto sm:h-52" />

        <h1 className="mt-10 text-headline">
          页面走丢了
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/75 dark:text-slate-300">
          这个地址没有对应的内容。可能是链接拼错了，也可能是这篇内容已经被移动或删除。
        </p>

        <span
          aria-hidden
          className="mt-8 block h-2 w-32 origin-left animate-rule rounded-full bg-gradient-to-r from-iris via-blush to-sun"
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border-[3px] border-ink/85 bg-sun/80 px-5 py-2.5 font-bold text-ink shadow-brutal-iris backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brutal-blush motion-reduce:hover:translate-y-0 dark:border-chalk/25 dark:bg-white/[0.08] dark:text-slate-100 dark:shadow-chalk dark:hover:shadow-chalk-lg"
          >
            回到首页
          </Link>
          <Link
            href="/posts"
            className="rounded-full border-[3px] border-ink/25 bg-white/50 px-5 py-2.5 font-bold text-ink/70 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/85 hover:shadow-brutal-sm motion-reduce:hover:translate-y-0 dark:border-chalk/15 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-chalk/40 dark:hover:shadow-chalk-sm"
          >
            浏览全部文章
          </Link>
        </div>
      </div>
    </main>
  );
}
