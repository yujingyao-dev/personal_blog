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
import { ZoomableImage } from '@/components/mdx/zoomable-image';

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
    <span className="not-prose my-3 block rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/80 p-3 font-mono text-xs text-amber-900 backdrop-blur dark:bg-amber-500/10 dark:text-amber-100">
      {props.value ?? null}
    </span>
  ),

  // --- Built-in element overrides ---------------------------------------------
  code_block: (props: { value?: string; lang?: string; children?: React.ReactNode }) => {
    const code = typeof props.value === 'string' ? props.value : '';
    return (
      <div
        data-tina-field={tinaField(props as unknown as Record<string, unknown>)}
        className="not-prose group relative my-8 overflow-hidden rounded-2xl border-[3px] border-ink/85 bg-slate-950/95 shadow-brutal-lg backdrop-blur-xl dark:border-chalk/20 dark:shadow-chalk-lg"
      >
        {/* Chrome bar: language chip on the left, copy affordance on the right. */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-white/10 bg-white/[0.04] px-4 py-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-xs font-bold tracking-wide text-slate-300">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mint" />
            {props.lang ?? 'text'}
          </span>
          {code ? <CopyButton value={code} /> : null}
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-slate-100">{code}</code>
        </pre>
        {/* Iridescent top edge — the gradient motif, at hairline scale. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-iris/70 to-transparent"
        />
      </div>
    );
  },

  // External links open in a new tab; internal links stay in the same tab.
  // Overriding `a` replaces TinaMarkdown's built-in sanitization, so sanitizeUrl delegates to
  // Tina's own sanitizer (see src/components/mdx/sanitize-url.ts). A URL it rejects renders as
  // plain text rather than an empty <a href="">.
  a: (props: { url?: string; children?: React.ReactNode }) => {
    const href = sanitizeUrl(props.url);
    if (!href) return <span>{props.children}</span>;

    const isExternal = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="font-semibold text-iris-text underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-blush-text dark:text-indigo-300 dark:hover:text-rose-300"
      >
        {props.children}
      </a>
    );
  },

  // Markdown images (`![alt](url)`) — NOT the <Figure> embed, which handles its
  // own rendering. Tina hands this node `{ url, caption, alt }`.
  // The URL is sanitized like any other: an `img` is a perfectly good way to
  // exfiltrate a request, and this content can come from the editor.
  img: (props: { url?: string; alt?: string; caption?: string }) => {
    const src = sanitizeUrl(props.url);
    if (!src) return null;
    const alt = props.alt ?? props.caption ?? '';

    return (
      <span className="not-prose my-8 block overflow-hidden rounded-2xl border-[3px] border-ink/85 bg-white/55 p-2 shadow-brutal-lg backdrop-blur-xl dark:border-chalk/20 dark:bg-white/[0.04] dark:shadow-chalk-lg">
        <ZoomableImage src={src} alt={alt} caption={props.caption}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" className="h-auto w-full rounded-xl" />
        </ZoomableImage>
      </span>
    );
  },

  // Tables need a scroll container, and a wrapper can only be injected by
  // overriding the node.
  //
  // ⚠️ Tina's PUBLISHED TYPE IS WRONG HERE. `Components['table']` is declared as
  //    `{ align?, tableRows }`, but the implementation
  //    (tinacms/dist/rich-text/index.js, `case "table"`) actually renders
  //    `<TableComponent>{thead}{tbody}</TableComponent>` — it passes CHILDREN and
  //    never `tableRows`. An override written from the type signature alone
  //    returns null and silently deletes every table in the site; that is exactly
  //    what happened on the first attempt. `satisfies` will not catch it because
  //    the declared type disagrees with the runtime.
  //
  //    The `tableRows` branch below is kept only as a defensive fallback for the
  //    editor's JSX path; `children` is what actually arrives.
  table: (props: {
    children?: React.ReactNode;
    tableRows?: { tableCells?: { value?: TinaMarkdownContent }[] }[] | null;
  }) => {
    const rows = props.tableRows ?? [];

    const table = props.children ? (
      <table className="w-full border-collapse text-sm">{props.children}</table>
    ) : rows.length > 0 ? (
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {(row?.tableCells ?? []).map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2.5 align-top">
                  <TinaMarkdown content={cell?.value ?? []} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ) : null;

    if (!table) return null;

    return (
      <div className="my-8 overflow-x-auto rounded-2xl border-2 border-ink/20 bg-white/50 backdrop-blur-sm dark:border-chalk/20 dark:bg-white/[0.03]">
        {table}
      </div>
    );
  },
} satisfies Record<string, (props: never) => React.ReactElement | null>;

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
