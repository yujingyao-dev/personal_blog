'use client';

import { useState } from 'react';

/** Copy-to-clipboard button used by the custom code_block renderer. */
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="text-xs text-slate-400 transition-colors hover:text-slate-200"
    >
      {copied ? '已复制' : '复制'}
    </button>
  );
}
