'use client';

import {
  type CalloutType,
  calloutAccents,
  calloutLabels,
  calloutStyles,
} from '@/components/mdx/callout-styles';
import type { TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { TinaMarkdown } from 'tinacms/dist/rich-text';

export type { CalloutType };

export interface CalloutProps {
  type?: string | null;
  title?: string | null;
  body?: string | null;
  children?: TinaMarkdownContent | TinaMarkdownContent[] | null;
}

function normalizeType(value?: string | null): CalloutType {
  return value && value in calloutStyles ? (value as CalloutType) : 'info';
}

/**
 * A display-only custom component. Nested rich text arrives as child nodes and is
 * rendered with a second <TinaMarkdown> call.
 *
 * Visual language: a thick saturated outline (Neo-Brutalism) over a translucent
 * tinted fill with `backdrop-blur` (glassmorphism), with the variant colour
 * repeated as a soft blurred glow in the corner so the slab does not read flat.
 * The label is NOT uppercased: `title` is author-supplied copy, and transforming
 * its case would be a content change rather than a style one.
 */
export function Callout({ type, title, body, children }: CalloutProps) {
  const variant = normalizeType(type);

  // The parser always attaches `children` as `{ type: 'root', children: [] }`, even for
  // self-closing embeds, so checking for the node alone would render an empty block.
  const childNodes = Array.isArray(children) ? children : children?.children;
  const hasChildren = Array.isArray(childNodes) ? childNodes.length > 0 : Boolean(childNodes);

  return (
    <aside
      className={`not-prose relative my-8 overflow-hidden rounded-2xl border-4 p-5 shadow-brutal backdrop-blur-xl backdrop-saturate-125 dark:shadow-chalk ${calloutStyles[variant]}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full opacity-25 blur-2xl ${calloutAccents[variant]}`}
      />

      <p className="relative mb-1.5 flex items-center gap-2 text-sm font-black tracking-wide">
        <span
          aria-hidden
          className={`h-2.5 w-2.5 shrink-0 rotate-45 rounded-[3px] ${calloutAccents[variant]}`}
        />
        {calloutLabels[variant]}
        {title ? ` · ${title}` : ''}
      </p>

      {body ? <p className="relative text-sm leading-relaxed">{body}</p> : null}

      {hasChildren ? (
        <div className="prose prose-sm relative mt-3 max-w-none dark:prose-invert">
          <TinaMarkdown content={children as TinaMarkdownContent} />
        </div>
      ) : null}
    </aside>
  );
}
