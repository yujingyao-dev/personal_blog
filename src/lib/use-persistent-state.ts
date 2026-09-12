'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Small persisted-state hook for interactive MDX components.
 *
 * Static sites have no backend, so interactivity is either ephemeral or stored in
 * localStorage. Reading in a `useEffect` (never during render) keeps server-rendered
 * HTML and the first client render identical, avoiding hydration mismatches.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const loaded = useRef(false);

  // Lazy hydration-safe read from localStorage.
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node || loaded.current) return;
      loaded.current = true;
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) setValue(JSON.parse(raw) as T);
      } catch {
        /* storage unavailable (private mode / disabled) — keep initial value */
      }
    },
    [key]
  );

  const set = useCallback(
    (updater: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const next =
          typeof updater === 'function' ? (updater as (p: T) => T)(previous) : updater;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore quota / disabled storage */
        }
        return next;
      });
    },
    [key]
  );

  return [value, set, ref] as const;
}
