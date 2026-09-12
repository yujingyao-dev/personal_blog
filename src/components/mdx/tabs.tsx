'use client';

import { useState } from 'react';

export interface TabItem {
  label?: string | null;
  content?: string | null;
}

export interface TabsProps {
  tabs?: TabItem[] | null;
}

/**
 * Interactive tabs.
 *
 * Tab bodies are plain strings (`type: 'string'` in the schema) because a nested
 * `rich-text` field inside an MDX template attribute would be serialized as an AST
 * object, which the MDX attribute parser rejects.
 *
 * The active tab is tracked by label so that inserting a tab in the editor does not
 * silently switch which panel the reader is looking at.
 */
export function Tabs({ tabs }: TabsProps) {
  const items = (tabs ?? []).filter((tab): tab is TabItem => Boolean(tab));
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  if (items.length === 0) return null;

  const found = items.findIndex((tab) => tab.label === activeLabel);
  const activeIndex = found === -1 ? 0 : found;
  const current = items[activeIndex];

  return (
    <div className="not-prose my-6 rounded-lg border border-slate-200 dark:border-slate-700">
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-slate-700"
      >
        {items.map((tab, index) => (
          <button
            key={`${tab.label}-${index}`}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => setActiveLabel(tab.label ?? null)}
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
      <div role="tabpanel" className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {current?.content ?? null}
      </div>
    </div>
  );
}
