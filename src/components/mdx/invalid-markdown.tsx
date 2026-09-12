'use client';

import { useState } from 'react';

export interface InvalidMarkdownProps {
  value?: string;
  message?: string;
}

/**
 * Fallback renderer for the node TinaCMS's MDX parser emits when it cannot parse a body.
 *
 * The parser replaces the ENTIRE body with a single `invalid_markdown` node on any failure
 * (an unknown attribute on an embed, an attribute whose type does not match the template
 * field, etc.). The default TinaMarkdown rendering for that node dumps the raw MDX into a
 * <pre>, so the article silently shows its own source. This makes the failure explicit
 * instead — visible locally while editing, and a collapsed note in production.
 */
export function InvalidMarkdown({ value, message }: InvalidMarkdownProps) {
  const [open, setOpen] = useState(false);
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isDev) {
    return (
      <div className="not-prose my-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-semibold">本文内容暂时无法渲染</p>
        <p className="mt-1">请联系站长，或稍后再试。</p>
        {message ? <p className="mt-1 text-xs opacity-70">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="not-prose my-6 rounded-lg border-2 border-dashed border-rose-400 bg-rose-50 p-4 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
      <p className="font-semibold">⚠ MDX 解析失败，正文已退化为原始源码</p>
      {message ? <p className="mt-1 font-mono text-xs">{message}</p> : null}
      <p className="mt-2 text-xs">
        常见原因：组件属性名拼写错误、属性类型与 <code>tina/config.ts</code> 里声明的字段类型不一致、
        或使用了未在 <code>richTextTemplates</code> 中注册的组件名。
      </p>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="mt-2 rounded border border-rose-400 px-2 py-0.5 text-xs"
      >
        {open ? '隐藏原始源码' : '查看原始源码'}
      </button>
      {open ? (
        <pre className="mt-2 max-h-60 overflow-auto rounded bg-rose-900/10 p-2 font-mono text-xs whitespace-pre-wrap">
          {value ?? '(no source)'}
        </pre>
      ) : null}
    </div>
  );
}
