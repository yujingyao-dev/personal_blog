'use client';

import { m } from 'framer-motion';
import { usePersistentState } from '@/lib/use-persistent-state';

export interface CounterProps {
  label?: string | null;
  initialValue?: number | null;
  step?: number | null;
}

/**
 * A purely client-side interactive component. Safe for a static site: it holds local
 * state only and never calls a backend.
 *
 * The count is persisted to localStorage so it survives navigation, and read in an
 * effect so the server-rendered HTML and the first client render agree.
 *
 * ── READ BEFORE EDITING ──────────────────────────────────────────────────────
 * `scripts/interaction-smoke.mjs` locates the value via `strong.tabular-nums` and
 * the buttons via their `aria-label` ("增加" / "减少"). The `<strong>` must stay a
 * single, non-animated-name element carrying exactly those classes: rendering the
 * digits through AnimatePresence would briefly mount two `<strong>` nodes and the
 * test's `.first()` read would race the exit animation.
 *
 * Reduced motion is handled globally by <MotionProvider> (`MotionConfig
 * reducedMotion="user"`), not by branching props on `useReducedMotion()` — that
 * hook is `null` during SSR, so branching would render the server and client
 * differently and trip a hydration mismatch.
 * ────────────────────────────────────────────────────────────────────────────
 */
export function Counter({ label, initialValue, step }: CounterProps) {
  const initial = typeof initialValue === 'number' ? initialValue : 0;
  const increment = typeof step === 'number' && step !== 0 ? step : 1;

  const storageKey = `mdx:counter:${label ?? 'counter'}:${initial}`;
  const [count, setCount] = usePersistentState<number>(storageKey, initial);

  const buttonClass =
    'grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink/85 bg-white/85 text-lg font-black leading-none shadow-brutal-xs transition-colors hover:bg-blush/70 dark:border-chalk/25 dark:bg-white/[0.08] dark:shadow-chalk-xs dark:hover:bg-blush/30';

  return (
    <div className="not-prose relative my-8 inline-flex items-center gap-3 overflow-hidden rounded-full border-[3px] border-ink/85 bg-white/65 p-2 shadow-brutal backdrop-blur-xl dark:border-chalk/20 dark:bg-white/[0.05] dark:shadow-chalk">
      {/* Soft gradient geometry inside the pill. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -bottom-8 h-20 w-20 rounded-full bg-[radial-gradient(circle_at_50%_50%,#6d5cff,transparent_70%)] opacity-30 blur-xl"
      />

      <m.button
        type="button"
        onClick={() => setCount((value) => value - increment)}
        whileHover={{ scale: 1.08, rotate: -4 }}
        whileTap={{ scale: 0.88 }}
        className={`relative ${buttonClass}`}
        aria-label="减少"
      >
        −
      </m.button>

      <span className="relative min-w-24 text-center text-sm font-bold">
        {label ? `${label}：` : ''}
        {/*
          `key` remounts the node on every change, which restarts the keyframe pop.
          Only one <strong> is ever mounted, so a text read never sees two values.
        */}
        <m.strong
          key={count}
          className="tabular-nums"
          animate={{ scale: [1, 1.14, 1] }}
          initial={false}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {count}
        </m.strong>
      </span>

      <m.button
        type="button"
        onClick={() => setCount((value) => value + increment)}
        whileHover={{ scale: 1.08, rotate: 4 }}
        whileTap={{ scale: 0.88 }}
        className={`relative ${buttonClass}`}
        aria-label="增加"
      >
        +
      </m.button>
    </div>
  );
}
