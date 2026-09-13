'use client';

import { LazyMotion, MotionConfig } from 'framer-motion';
import { useNoMotion } from '@/components/site/use-no-motion';

/**
 * Loads Framer Motion's feature bundle AFTER hydration, in its own chunk.
 *
 * framer-motion was measured at **43.5 KB gzipped in a single chunk loaded by
 * every route** (the provider sits in the root layout, so there is no page that
 * escapes it). `LazyMotion` keeps only the small `m` component and
 * `AnimatePresence` in the initial bundle and fetches the animation engine
 * afterwards, which takes that 43.5 KB off the critical path.
 *
 * `domMax` rather than `domAnimation`: `domAnimation` omits layout animations,
 * and this site uses them (`layout` on the post list, `layoutId` on the tab
 * pill). Choosing the smaller bundle would silently break both.
 *
 * Returning the promise from a function is what makes it a separate chunk — a
 * direct `features={domMax}` import would be bundled inline and save nothing.
 */
const loadFeatures = () => import('framer-motion').then((mod) => mod.domMax);

/**
 * Applies the "no motion on this device" rule to every Framer Motion animation
 * in the tree.
 *
 * Why this exists instead of each component calling `useReducedMotion()`:
 * that hook returns `null` during SSR and a real boolean on the client, so any
 * prop branched on it (`animate={reduceMotion ? undefined : {...}}`) makes the
 * server and client render different attributes — a hydration mismatch. Routing
 * the decision through the config keeps every component's props constant across
 * the boundary: `reducedMotion="always"` makes Framer itself skip transform and
 * layout animations.
 *
 * `useNoMotion()` covers both the visitor's reduced-motion preference AND the
 * project rule that mobile gets no animation at all — see that file for why the
 * mobile half is not negotiable.
 *
 * `children` arrives as an already-rendered React Server Component payload, so
 * wrapping the tree here does not drag page content into the client bundle.
 *
 * `strict` turns the "use `m`, not `motion`" rule into a loud runtime error
 * instead of a silent performance regression: rendering a `motion.*` component
 * inside `LazyMotion` would synchronously pull in the whole feature bundle,
 * cancelling the saving this component exists to make.
 *
 * `reducedMotion` goes on `MotionConfig`, not on `LazyMotion` — LazyMotion takes
 * only `features`, `strict` and `children`.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const noMotion = useNoMotion();
  return (
    <MotionConfig reducedMotion={noMotion ? 'always' : 'user'}>
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
