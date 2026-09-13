'use client';

import { useRef, useState } from 'react';
import { m } from 'framer-motion';

/**
 * Copy-to-clipboard button used by the custom code_block renderer.
 *
 * Framer Motion owns the feedback here: the label swaps inside a keyed, animated
 * pill so a successful copy reads as a colour + position change rather than a
 * silent text swap. `useRef` keeps the reset timeout addressable so rapid clicks
 * cannot leave a stale "已复制" on screen.
 *
 * Reduced motion comes from <MotionProvider> (`MotionConfig reducedMotion="user"`)
 * rather than a local `useReducedMotion()` branch, which is `null` during SSR.
 */
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  return (
    <m.button
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.94 }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold backdrop-blur transition-colors duration-200 ${
        copied
          ? 'border-mint/70 bg-mint/20 text-emerald-200'
          : 'border-transparent bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-slate-100'
      }`}
    >
      {/* Keyed remount gives the label change a small pop without cross-fading text. */}
      <m.span
        key={copied ? 'copied' : 'idle'}
        animate={{ scale: [0.85, 1] }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="inline-block"
      >
        {copied ? '已复制' : '复制'}
      </m.span>
    </m.button>
  );
}
