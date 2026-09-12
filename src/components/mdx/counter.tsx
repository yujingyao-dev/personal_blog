'use client';

import { useState } from 'react';

export interface CounterProps {
  label?: string | null;
  initialValue?: number | null;
  step?: number | null;
}

/**
 * A purely client-side interactive component. Safe for a static site: it holds local
 * state only and never calls a backend.
 */
export function Counter({ label, initialValue, step }: CounterProps) {
  const initial = typeof initialValue === 'number' ? initialValue : 0;
  const increment = typeof step === 'number' ? step : 1;
  const [count, setCount] = useState(initial);

  return (
    <div className="not-prose my-6 inline-flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setCount((value) => value - increment)}
        className="h-8 w-8 rounded-md bg-slate-100 text-lg leading-none hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        aria-label="减少"
      >
        −
      </button>
      <span className="min-w-24 text-center text-sm">
        {label ? `${label}：` : ''}
        <strong className="tabular-nums">{count}</strong>
      </span>
      <button
        type="button"
        onClick={() => setCount((value) => value + increment)}
        className="h-8 w-8 rounded-md bg-slate-100 text-lg leading-none hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        aria-label="增加"
      >
        +
      </button>
    </div>
  );
}
