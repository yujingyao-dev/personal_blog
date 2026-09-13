'use client';

import { useId, useState } from 'react';
import { m } from 'framer-motion';

export interface TabItem {
  label?: string | null;
  content?: string | null;
}

export interface TabsProps {
  tabs?: TabItem[] | null;
}

/**
 * Interactive tabs implementing the WAI-ARIA tabs pattern (roving tabindex, arrow keys,
 * aria-controls/aria-labelledby).
 *
 * Tab bodies are plain strings (`type: 'string'` in the schema) because a nested
 * `rich-text` field inside an MDX template attribute would be serialized as an AST
 * object, which the MDX attribute parser rejects.
 *
 * The active tab is tracked by index and clamped to the available range, so duplicate or
 * empty labels (easy to produce in the editor) cannot select the wrong panel, and
 * inserting a tab cannot point the selection past the end.
 *
 * ── Motion note ──────────────────────────────────────────────────────────────
 * `firstRender` guards the panel's entrance animation. Framer Motion serialises an
 * `initial` of `{ opacity: 0 }` into the prerendered HTML, which would leave the first
 * panel invisible to a visitor without JavaScript on an otherwise fully static page.
 * Until the reader actually switches tabs we render `initial={false}` (i.e. already in
 * the `animate` state); only real switches animate.
 *
 * Reduced motion is handled globally by <MotionProvider> (`MotionConfig
 * reducedMotion="user"`) rather than by branching props on `useReducedMotion()`,
 * which is `null` during SSR and would therefore render the server and client
 * differently.
 * ────────────────────────────────────────────────────────────────────────────
 */
export function Tabs({ tabs }: TabsProps) {
  const items = (tabs ?? []).filter((tab): tab is TabItem => Boolean(tab));
  const [active, setActive] = useState(0);
  const [hasSwitched, setHasSwitched] = useState(false);
  const baseId = useId();

  if (items.length === 0) return null;

  const activeIndex = Math.min(active, items.length - 1);
  const current = items[activeIndex];

  const focusTab = (index: number) => {
    const bounded = (index + items.length) % items.length;
    setActive(bounded);
    setHasSwitched(true);
    document.getElementById(`${baseId}-tab-${bounded}`)?.focus();
  };

  const panelInitial = hasSwitched ? { opacity: 0, y: 8 } : false;

  return (
    <div className="not-prose relative my-8 overflow-hidden rounded-2xl border-[3px] border-ink/85 bg-white/60 shadow-brutal backdrop-blur-xl dark:border-chalk/20 dark:bg-white/[0.04] dark:shadow-chalk">
      <div
        role="tablist"
        className="flex flex-wrap gap-1.5 border-b-[3px] border-ink/85 bg-white/45 p-2.5 dark:border-chalk/20 dark:bg-white/[0.03]"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            focusTab(activeIndex + 1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            focusTab(activeIndex - 1);
          } else if (event.key === 'Home') {
            event.preventDefault();
            focusTab(0);
          } else if (event.key === 'End') {
            event.preventDefault();
            focusTab(items.length - 1);
          }
        }}
      >
        {items.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${index}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                setActive(index);
                setHasSwitched(true);
              }}
              className={`relative isolate rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors duration-200 ${
                isActive
                  ? 'text-white'
                  : 'text-ink/60 hover:bg-white/70 hover:text-ink dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              {/* The pill slides between tabs rather than cross-fading.

                  ⚠️ The gradient uses the `-text` accent variants, and the label is
                  ALWAYS white (no `dark:text-ink`). This is a contrast fix, not a
                  style preference:

                    white on `--color-iris`  (#6d5cff) = 4.54:1  (only just passes)
                    white on `--color-blush` (#ff6b9d) = 2.68:1  FAILS AA
                    ink   on `--color-iris`            = 4.03:1  FAILS AA

                  A gradient runs the whole way between its stops, so the label has
                  to clear the WORST stop, not the average one. `iris-text` ->
                  `blush-text` gives 6.88:1 -> 5.87:1 for white, in both themes, so
                  the dark-mode `text-ink` (which measured 2.66:1 on the dark end)
                  is gone as well. Kept as one code path for both themes. */}
              {isActive ? (
                <m.span
                  aria-hidden
                  layoutId={`${baseId}-pill`}
                  className="absolute inset-0 -z-10 rounded-full border-2 border-ink/70 bg-gradient-to-br from-iris-text to-blush-text shadow-brutal-xs dark:border-chalk/30 dark:shadow-chalk-xs"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              {tab.label ?? `标签 ${index + 1}`}
            </button>
          );
        })}
      </div>

      <m.div
        key={activeIndex}
        role="tabpanel"
        id={`${baseId}-panel-${activeIndex}`}
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
        tabIndex={0}
        initial={panelInitial}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative p-5 text-sm leading-relaxed whitespace-pre-wrap"
      >
        {current?.content ?? null}
      </m.div>
    </div>
  );
}
