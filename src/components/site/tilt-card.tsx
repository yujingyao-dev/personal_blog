'use client';

import { m, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNoMotion } from '@/components/site/use-no-motion';

/**
 * A card that tilts toward the pointer and lifts on hover.
 *
 * Used for the post cards on the home and list pages. Two details matter:
 *
 * 1. **It owns the hover transform.** The cards previously did their lift with
 *    `hover:-translate-y-1`, which cannot coexist with this: Framer writes the
 *    transform as an *inline style*, and inline styles beat class-based
 *    declarations, so the CSS lift would silently stop working. The lift is
 *    therefore `whileHover={{ y }}` here, and the className keeps only the
 *    shadow/colour transitions — those are separate properties and still work.
 *
 * 2. **Mouse only.** `onPointerMove` also fires for touch and pen; tilting on
 *    touch would make the card flinch while the finger scrolls the page, so
 *    non-mouse pointers are ignored outright.
 *
 * `useReducedMotion` is safe to branch on here even though it is `null` during
 * SSR: it only selects between two MotionValues that both start at 0, so the
 * server and the first client render produce identical markup.
 */
export function TiltCard({
  children,
  className,
  /** How far the card rises on hover, in px. */
  lift = 6,
  /** Maximum rotation at the card's edge, in degrees. */
  maxTilt = 5,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: number;
  maxTilt?: number;
}) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // A fairly stiff spring: the tilt should feel attached to the cursor, not lag
  // behind it, while still absorbing jitter from a shaky hand.
  const config = { stiffness: 260, damping: 26, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [maxTilt, -maxTilt]), config);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-maxTilt, maxTilt]), config);

  const noMotion = useNoMotion();

  return (
    <m.article
      onPointerMove={(event) => {
        if (noMotion || event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width - 0.5);
        py.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      whileHover={noMotion ? undefined : { y: -lift }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </m.article>
  );
}
