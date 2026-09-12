'use client';

import { useId, useState } from 'react';

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
 */
export function Tabs({ tabs }: TabsProps) {
  const items = (tabs ?? []).filter((tab): tab is TabItem => Boolean(tab));
  const [active, setActive] = useState(0);
  const baseId = useId();

  if (items.length === 0) return null;

  const activeIndex = Math.min(active, items.length - 1);
  const current = items[activeIndex];

  const focusTab = (index: number) => {
    const bounded = (index + items.length) % items.length;
    setActive(bounded);
    document.getElementById(`${baseId}-tab-${bounded}`)?.focus();
  };

  return (
    <div className="not-prose my-6 rounded-lg border border-slate-200 dark:border-slate-700">
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-slate-700"
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
        {items.map((tab, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            id={`${baseId}-tab-${index}`}
            aria-selected={index === activeIndex}
            aria-controls={`${baseId}-panel-${index}`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => setActive(index)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              index === activeIndex
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label ?? `标签 ${index + 1}`}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeIndex}`}
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
        tabIndex={0}
        className="p-4 text-sm leading-relaxed whitespace-pre-wrap"
      >
        {current?.content ?? null}
      </div>
    </div>
  );
}
