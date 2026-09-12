'use client';

import { tinaField } from 'tinacms/dist/react';
import type { Components, TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { TinaMarkdown } from 'tinacms/dist/rich-text';
import { Callout } from '@/components/mdx/callout';
import { Counter } from '@/components/mdx/counter';
import { CopyButton } from '@/components/mdx/copy-button';
import { Figure } from '@/components/mdx/figure';
import { InvalidMarkdown } from '@/components/mdx/invalid-markdown';
import { sanitizeUrl } from '@/components/mdx/sanitize-url';
import { Tabs } from '@/components/mdx/tabs';
import { VideoEmbed } from '@/components/mdx/video-embed';

/**
 * Props as delivered by <TinaMarkdown>. The `Record<string, unknown>` extension is
 * required by `tinaField`, and `_content_source` is the metadata TinaCMS injects in
 * edit mode (see the Click-To-Edit API docs).
 */
export interface CalloutBlockProps extends Record<string, unknown> {
  type?: 'info' | 'warning' | 'success' | 'danger' | null;
  title?: string | null;
  body?: string | null;
  children?: TinaMarkdownContent | TinaMarkdownContent[] | null;
}

export interface CounterBlockProps extends Record<string, unknown> {
  label?: string | null;
  initialValue?: number | null;
  step?: number | null;
}

export interface TabsBlockProps extends Record<string, unknown> {
  tabs?: { label?: string | null; content?: string | null }[] | null;
}

export interface FigureBlockProps extends Record<string, unknown> {
  src?: string | null;
  alt?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  priority?: boolean | null;
}

export interface VideoEmbedBlockProps extends Record<string, unknown> {
  provider?: string | null;
  videoId?: string | null;
  title?: string | null;
  caption?: string | null;
}

/**
 * Maps MDX/rich-text element names to React components.
 *
 * The keys MUST match the `name` of each rich-text template in `tina/config.ts`
 * (PascalCase!), which is also the element name the editor writes into the .mdx file.
 *
 * Each custom entry wraps the component in `<div data-tina-field={tinaField(props)}>`.
 * In edit mode TinaCMS injects `_content_source` metadata into `props`; `tinaField` turns
 * that into the path the editor needs, enabling click-to-edit from the page.
 * `[data-tina-field]` must sit on an HTML element, not on a React component.
 */
const components = {
  // --- Custom components inserted from the editor's "embed" menu ---------------
  Callout: (props: CalloutBlockProps) => (
    <div data-tina-field={tinaField(props)}>
      <Callout {...props} />
    </div>
  ),

  Counter: (props: CounterBlockProps) => (
    <div data-tina-field={tinaField(props)}>
      <Counter {...props} />
    </div>
  ),

  Tabs: (props: TabsBlockProps) => (
    <div data-tina-field={tinaField(props)}>
      <Tabs {...props} />
    </div>
  ),

  Figure: (props: FigureBlockProps) => (
    <div data-tina-field={tinaField(props)}>
      <Figure {...props} />
    </div>
  ),

  VideoEmbed: (props: VideoEmbedBlockProps) => (
    <div data-tina-field={tinaField(props)}>
      <VideoEmbed {...props} />
    </div>
  ),

  // --- Parser failure nodes ----------------------------------------------------
  // Without these, a body that fails to parse renders as raw MDX source with no signal.
  invalid_markdown: (props: { value?: string; message?: string; children?: React.ReactNode }) => (
    <InvalidMarkdown value={props.value} message={props.message} />
  ),

  // A template name removed from the schema degrades to a raw HTML node; keep it inert
  // and visible rather than letting it render as markup.
  html: (props: { value?: string; children?: React.ReactNode }) => (
    <span className="not-prose my-2 block rounded border border-dashed border-amber-400 bg-amber-50 p-2 font-mono text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      {props.value ?? null}
    </span>
  ),

  // --- Built-in element overrides ---------------------------------------------
  code_block: (props: { value?: string; lang?: string; children?: React.ReactNode }) => {
    const code = typeof props.value === 'string' ? props.value : '';
    return (
      <div
        data-tina-field={tinaField(props as unknown as Record<string, unknown>)}
        className="not-prose group relative my-6 overflow-hidden rounded-lg bg-slate-900 dark:bg-slate-950"
      >
        <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-1.5">
          <span className="text-xs text-slate-400">{props.lang ?? 'text'}</span>
          {code ? <CopyButton value={code} /> : null}
        </div>
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
          <code className="font-mono text-slate-100">{code}</code>
        </pre>
      </div>
    );
  },

  // External links open in a new tab; internal links stay in the same tab. URLs are
  // sanitized because overriding `a` replaces TinaMarkdown's built-in sanitization.
  a: (props: { url?: string; children?: React.ReactNode }) => {
    const href = sanitizeUrl(props.url);
    if (!href) return <span>{props.children}</span>;

    const isExternal = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="text-sky-600 underline underline-offset-2 hover:text-sky-500 dark:text-sky-400"
      >
        {props.children}
      </a>
    );
  },
} satisfies Record<string, (props: never) => React.ReactElement>;

/**
 * The cast below is confined to this one line. The prop interfaces above are the real
 * contract with `tina/config.ts`; keep them in sync when renaming schema fields —
 * `npm run typecheck` cannot catch a rename inside the generated GraphQL types because
 * `post.body` is typed `any`.
 */
const typedComponents = components as unknown as Components<Record<string, never>>;

export function Body({ content }: { content: TinaMarkdownContent | TinaMarkdownContent[] }) {
  return <TinaMarkdown content={content} components={typedComponents} />;
}

export default Body;
