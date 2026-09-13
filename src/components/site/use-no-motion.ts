'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * "This device gets no motion" — the single source of truth.
 *
 * True when EITHER:
 *   - the visitor asked for reduced motion, OR
 *   - the viewport is below `md`.
 *
 * The mobile half is a **standing project rule, not a preference**: motion is
 * whatever is left after the ambient backdrop animation was measured as the
 * dominant continuous cost on the page (see STYLE-DIRECTIONS.md §7), so phones
 * get none of it. Do not "re-enable a little motion for small screens" later —
 * that decision has been made and the reasoning is recorded.
 *
 * ── Why a hook and not just `MotionConfig` ──────────────────────────────────
 * `<MotionProvider>` uses this to set `reducedMotion="always"`, which covers
 * everything Framer animates. But `MotionConfig` does NOT gate MotionValues that
 * are driven directly (`useSpring` on a scroll source), and two places do that:
 * the article's reading-progress bar and the backdrop parallax. Both would keep
 * animating on a phone. They call this hook and swap in a constant instead.
 *
 * `useReducedMotion()` is `null` during SSR, so this returns `false` on the
 * server and on the first client render. Callers must only use it to choose
 * between values that RENDER IDENTICALLY at rest (both start at 0), which is the
 * case for every caller here.
 */
const MOBILE_QUERY = '(max-width: 47.999rem)'; // Tailwind's `max-md`

export function useNoMotion() {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return Boolean(prefersReducedMotion) || isMobile;
}
