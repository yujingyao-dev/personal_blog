'use client';

/**
 * Theme toggle: switches between light and dark.
 *
 * ── Why this component has no state ─────────────────────────────────────────
 * The obvious implementation (`useState` + read localStorage in an effect) has
 * two problems on a statically prerendered page:
 *
 *   1. The server cannot know the stored preference, so the first client render
 *      disagrees with the HTML -> hydration mismatch, or you gate on a `mounted`
 *      flag, which makes the control pop in after paint.
 *   2. Whichever icon you render before the effect runs is briefly WRONG, so the
 *      button visibly flips.
 *
 * Instead the blocking script in `layout.tsx` writes `data-theme` onto <html>
 * before first paint. Both icons are always in the DOM and CSS decides which is
 * visible, so the server and client render byte-identical markup and there is
 * nothing to flicker. The click handler reads the current theme straight off the
 * DOM, so this file needs no React state at all.
 *
 * ── Why the icon is driven by an arbitrary variant ──────────────────────────
 * `[[data-theme=dark]_&]:hidden` compiles to
 * `[data-theme=dark] .<class> { display: none }` — an ancestor match, which is
 * what we need since the attribute lives on <html>. Keeping it in the className
 * means the whole control stays inspectable from the markup, matching how the
 * rest of the site is styled.
 *
 * ── There is deliberately no "follow system" third state ────────────────────
 * It had one, with a monitor icon. It was removed on request. The consequence is
 * worth stating so nobody "restores" it by accident: a visitor who has never
 * toggled still follows their OS, because the blocking script resolves the
 * initial value from `prefers-color-scheme` and nothing is written to
 * localStorage until they click. Once they click, the choice is pinned — that is
 * what a two-state switch means, and there is no longer a way back to "system"
 * short of clearing site data.
 */

type Theme = 'light' | 'dark';

/**
 * Duplicated in `layout.tsx`'s blocking script — that script is a plain string
 * that runs before any module loads, so it cannot import this. Change both
 * together. `scripts/unit-no-motion.mjs` does not cover it; the theme smoke check
 * does.
 */
const STORAGE_KEY = 'theme';

/** The icon shown in each theme; exactly one is visible at a time. */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className="h-4 w-4">
      <circle cx="12" cy="12" r="4.2" className="fill-sun stroke-ink dark:stroke-chalk" strokeWidth="2" />
      <g className="stroke-ink dark:stroke-chalk" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className="h-4 w-4">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
        className="fill-iris stroke-ink dark:stroke-chalk"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => {
        const next: Theme =
          document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Private mode / storage disabled: the choice just will not persist.
        }
      }}
      // The accessible name is static, so it never desyncs from the DOM; the
      // visible icon carries the state and `title` spells out what it does.
      aria-label="切换明暗主题"
      title="切换明暗主题"
      className="group grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-transparent text-ink/65 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:bg-white/85 hover:shadow-brutal-xs motion-reduce:hover:translate-y-0 dark:text-slate-300 dark:hover:border-chalk dark:hover:bg-white/10 dark:hover:shadow-chalk-xs"
    >
      {/* Before the script runs — and with JavaScript disabled, where the page
          stays light because the `dark` variant never matches — the sun is the
          icon that matches what is actually drawn. */}
      <span className="block [[data-theme=dark]_&]:hidden">
        <SunIcon />
      </span>
      <span className="hidden [[data-theme=dark]_&]:block">
        <MoonIcon />
      </span>
    </button>
  );
}
