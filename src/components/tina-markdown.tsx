'use client';

import { tinaField } from 'tinacms/dist/react';
import { Callout } from '@/components/mdx/callout';
import { Counter } from '@/components/mdx/counter';
import { CopyButton } from '@/components/mdx/copy-button';
import { Tabs } from '@/components/mdx/tabs';
import type { Components, TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { TinaMarkdown } from 'tinacms/dist/rich-text';

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

/**
 * The single source of truth that maps MDX/rich-text element names to React components.
 *
 * The keys MUST match:
 *  - the `name` of each rich-text template in `tina/config.ts` (PascalCase!), and
 *  - the element name the editor writes into the .mdx file.
 *
 * Each custom entry wraps the component in a `<div data-tina-field={tinaField(props)}>`.
 * In edit mode TinaCMS injects `_content_source` metadata into `props`; `tinaField` turns
 * that into the path the editor needs, enabling click-to-edit straight from the page.
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

  // --- Built-in element overrides ---------------------------------------------
  code_block: (props: { value?: string; lang?: string; children?: React.ReactNode }) => {
    const code = typeof props.value === 'string' ? props.value : '';
    return (
      <div className="not-prose group relative my-6 overflow-hidden rounded-lg bg-slate-900 dark:bg-slate-950">
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

  // External links open in a new tab; internal links stay in the same tab.
  a: (props: { url?: string; children?: React.ReactNode }) => {
    const isExternal = Boolean(props.url && /^https?:\/\//.test(props.url));
    return (
      <a
        href={props.url}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="text-sky-600 underline underline-offset-2 hover:text-sky-500 dark:text-sky-400"
      >
        {props.children}
      </a>
    );
  },
} satisfies Record<string, (props: never) => React.ReactElement>;

// `satisfies` above keeps the concrete prop types; cast once here for TinaMarkdown's
// generic `Components<...>` parameter.
const typedComponents = components as unknown as Components<Record<string, never>>;

export function Body({ content }: { content: TinaMarkdownContent | TinaMarkdownContent[] }) {
  return <TinaMarkdown content={content} components={typedComponents} />;
}

export default Body;
