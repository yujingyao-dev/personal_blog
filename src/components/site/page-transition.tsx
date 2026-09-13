'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { m } from 'framer-motion';
import { useNoMotion } from '@/components/site/use-no-motion';

/**
 * Fades and lifts each route's content in as you navigate.
 *
 * ── The rule this has to obey ───────────────────────────────────────────────
 * Page content must be visible in the prerendered HTML. Framer serialises
 * `initial={{ opacity: 0 }}` into the static markup, so animating the FIRST
 * paint would ship a site whose text is invisible until (and unless) JavaScript
 * runs — the same trap documented for `Tabs` and the article body.
 *
 * So the entrance animation is gated on `hydrated`:
 *
 *   - first render (server AND the client's hydration pass): `initial={false}`,
 *     i.e. already in the `animate` state -> content is visible immediately and
 *     the two renders agree;
 *   - after mount, any pathname change remounts the keyed wrapper and this time
 *     the entrance animation really runs.
 *
 * The result is "animates between pages, never hides the landing page".
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const noMotion = useNoMotion();

  useEffect(() => setHydrated(true), []);

  return (
    <m.div
      key={pathname}
      initial={hydrated && !noMotion ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  );
}
