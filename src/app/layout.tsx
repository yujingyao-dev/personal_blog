import type { Metadata } from 'next';
import Link from 'next/link';
import { Backdrop } from '@/components/site/backdrop';
import { MotionProvider } from '@/components/site/motion-provider';
import { PageTransition } from '@/components/site/page-transition';
import { ThemeToggle } from '@/components/site/theme-toggle';
import { metadataBaseUrl } from '@/lib/site-url';
import './globals.css';

const SITE_NAME = '我的博客';
const SITE_DESCRIPTION = '一个用 TinaCMS + Next.js 构建的静态个人博客';

/**
 * Runs before first paint, as the first element in <body>.
 *
 * The page is statically prerendered, so the server cannot know the visitor's
 * stored preference. Doing this in an effect instead would paint the light theme
 * first and then flip — a full-page flash of the wrong theme on every load.
 *
 * The toggle is two-state (there is no "follow system" option), but the OS is
 * still consulted for the INITIAL value: nothing is written to localStorage until
 * the visitor actually clicks, so someone who never touches the control keeps
 * matching their system preference on every visit. After one click the choice is
 * pinned, which is what a two-state switch means.
 *
 * The storage key must stay in sync with `src/components/site/theme-toggle.tsx`.
 */
const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem('theme');
var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.dataset.theme=d?'dark':'light';
}catch(_){document.documentElement.dataset.theme='light';}})();`;

export const metadata: Metadata = {
  // metadataBase is what turns the relative canonical/Open Graph URLs into absolute ones.
  // Without it Next emits href="/posts/x", which crawlers and social platforms cannot use —
  // a shared link then has no usable URL or image.
  metadataBase: metadataBaseUrl(),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

/**
 * A nav pill.
 *
 * The hover state is a Neo-Brutalist "sticker": the border snaps in and the pill
 * lifts onto a hard offset shadow. `motion-reduce` neutralises the lift so the
 * colour change still communicates hover when animation is not wanted.
 */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border-2 border-transparent px-3 py-1.5 font-bold text-ink/65 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:bg-white/85 hover:text-ink hover:shadow-brutal-xs motion-reduce:hover:translate-y-0 dark:text-slate-300 dark:hover:border-chalk dark:hover:bg-white/10 dark:hover:text-white dark:hover:shadow-chalk-xs"
    >
      {children}
    </Link>
  );
}

function SiteHeader() {
  return (
    // Pillar 1: the header is a frosted sheet that content scrolls underneath.
    <header className="sticky top-0 z-40 border-b-2 border-ink/10 bg-white/60 backdrop-blur-xl backdrop-saturate-150 print:hidden dark:border-chalk/10 dark:bg-midnight/60">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          {/* Logo mark: gradient geometry inside a hard outline. */}
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-gradient-to-br from-sun via-blush to-iris shadow-brutal-xs transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100 dark:border-chalk dark:shadow-chalk-xs"
          >
            <span className="h-3 w-3 rotate-45 rounded-[3px] bg-ink/90 dark:bg-midnight/90" />
          </span>
          <span className="text-base font-black tracking-tight">{SITE_NAME}</span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <NavLink href="/posts">文章</NavLink>
          <NavLink href="/about">关于</NavLink>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="relative z-10 mt-20 print:hidden">
      <div className="border-t-2 border-ink/15 bg-white/55 backdrop-blur-xl dark:border-chalk/15 dark:bg-white/[0.03]">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 text-sm text-ink/70 sm:flex-row sm:items-center sm:justify-between dark:text-slate-300">
          <p>
            © {new Date().getFullYear()} {SITE_NAME} · Built with Next.js &amp; TinaCMS
          </p>
          {/* Decorative "sticker" row — the shape family used across the site. */}
          <div aria-hidden className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-ink bg-sun dark:border-chalk" />
            <span className="h-3.5 w-3.5 rotate-12 rounded-[4px] border-2 border-ink bg-blush dark:border-chalk" />
            <span className="h-3.5 w-3.5 rounded-full border-2 border-ink bg-mint dark:border-chalk" />
            <span className="h-3.5 w-3.5 -rotate-12 rounded-[4px] border-2 border-ink bg-iris dark:border-chalk" />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      /*
        Required, and scoped to exactly this element.
        THEME_INIT_SCRIPT below writes `data-theme` onto <html> before React
        hydrates, so on the first client render React sees an attribute it did not
        render itself and reports a mismatch. That mismatch is the whole point —
        the alternative is painting the wrong theme and then flipping.
        `suppressHydrationWarning` covers only this element's own attributes, so a
        real mismatch anywhere inside the tree still surfaces.
      */
      suppressHydrationWarning
    >
      {/*
        `isolate` is load-bearing, not cosmetic: the Backdrop uses `-z-10`, and without a
        stacking context on <body> a negative-z child paints behind the body background
        and disappears.
      */}
      <body className="isolate flex min-h-screen flex-col overflow-x-hidden">
        {/* Must stay first in <body>: parser-blocking, so nothing paints before it runs. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/*
          Backdrop is INSIDE MotionProvider on purpose — it must not move back out.

          It renders `m.div` wrappers whose transforms are driven by MotionValues
          (scroll parallax + the pointer "water" push). `m` components get their
          capabilities from an enclosing `<LazyMotion>`; outside one they still
          render their markup but never bind MotionValues, so every transform
          silently collapses to `transform: none`. That is exactly what happened:
          the parallax was dead from the moment LazyMotion was introduced in P2
          until an instrumented probe caught it, because the check that was
          supposed to cover it only asserted that a `style` attribute existed —
          and `transform: none` satisfies that.

          Nesting is free here: MotionConfig and LazyMotion are context providers
          that render no DOM, so `fixed inset-0` positioning is unaffected.
        */}
        <MotionProvider>
          <Backdrop />
          <SiteHeader />
          <div className="flex-1">
            <PageTransition>{children}</PageTransition>
          </div>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
