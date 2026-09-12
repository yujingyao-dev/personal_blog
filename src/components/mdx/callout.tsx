'use client';

import {
  type CalloutType,
  calloutLabels,
  calloutStyles,
} from '@/components/mdx/callout-styles';
import type { TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { TinaMarkdown } from 'tinacms/dist/rich-text';

export type { CalloutType };

export interface CalloutProps {
  type?: CalloutType | null;
  title?: string | null;
  body?: string | null;
  children?: TinaMarkdownContent | TinaMarkdownContent[] | null;
}

/**
 * A display-only custom component. Nested rich text arrives as child nodes and is
 * rendered with a second <TinaMarkdown> call.
 */
export function Callout({ type, title, body, children }: CalloutProps) {
  const variant: CalloutType = type ?? 'info';
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children && children.type);

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
