'use client';

import type { TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { TinaMarkdown } from 'tinacms/dist/rich-text';
import { useState } from 'react';

export type CalloutType = 'info' | 'warning' | 'success' | 'danger';

export interface CalloutProps {
  type?: CalloutType | null;
  title?: string | null;
  body?: string | null;
  children?: TinaMarkdownContent | TinaMarkdownContent[] | null;
}

const calloutStyles: Record<CalloutType, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100',
  warning:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100',
  success:
    'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100',
  danger:
    'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100',
};

const calloutLabels: Record<CalloutType, string> = {
  info: '提示',
  warning: '注意',
  success: '成功',
  danger: '警告',
};

/**
 * A display-only custom component. Nested rich text arrives as child nodes and is
 * rendered with a second <TinaMarkdown> call.
 */
export function Callout({ type, title, body, children }: CalloutProps) {
  const variant: CalloutType = type ?? 'info';
  const hasChildren =
    Array.isArray(children) ? children.length > 0 : Boolean(children && children.type);

  return (
    <aside className={`not-prose my-6 rounded-lg border-l-4 p-4 ${calloutStyles[variant]}`}>
      <p className="mb-1 text-sm font-semibold">
        {calloutLabels[variant]}
        {title ? ` · ${title}` : ''}
      </p>
      {body ? <p className="text-sm leading-relaxed">{body}</p> : null}
      {hasChildren ? (
        <div className="prose prose-sm mt-2 max-w-none dark:prose-invert">
          <TinaMarkdown content={children as TinaMarkdownContent} />
        </div>
      ) : null}
    </aside>
  );
}
