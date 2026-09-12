'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small persisted-state hook for interactive MDX components.
 *
 * Static sites have no backend, so interactivity is either ephemeral or stored in
 * localStorage. This hook deliberately splits the two concerns:
 *
 *  - The initial value is used for the server render and the first client render, so the
 *    markup matches and React does not report a hydration mismatch.
 *  - The stored value (and any change) is applied in an effect, after hydration.
 *  - When `key` changes — which happens while editing, because the key is derived from the
 *    component's fields — the stored value is re-read instead of being ignored. Without
 *    that, changing `initialValue` in the CMS would have no visible effect on the preview.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);
  // Keep the latest default without re-running the key effect on every render.
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  useEffect(() => {
    hydrated.current = false;
    let restored = initialRef.current;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) restored = JSON.parse(raw) as T;
    } catch {
      /* storage unavailable (private mode / disabled) — keep the initial value */
    }
    hydrated.current = true;
    setValue(restored);
  }, [key]);

  const set = useCallback(
    (updater: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const next =
          typeof updater === 'function' ? (updater as (p: T) => T)(previous) : updater;
        // Only persist after the restore effect has run, otherwise the initial server
        // value could overwrite a value that is about to be restored.
        if (hydrated.current) {
          try {
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {
            /* ignore quota / disabled storage */
          }
        }
        return next;
      });
    },
    [key]
  );

  return [value, set] as const;
}
