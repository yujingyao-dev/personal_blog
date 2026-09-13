'use client';

import { useEffect, useRef } from 'react';
import { m, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { useNoMotion } from '@/components/site/use-no-motion';

/**
 * Decorative background layer — pillar 2 of the visual language
 * ("large, gradient-coloured, slowly flowing geometry").
 *
 * Purely presentational: `aria-hidden`, `pointer-events-none`, no data or state.
 * It sits at `-z-10` under the `isolate` stacking context on <body>, which is
 * what keeps negative-z content painted above the body background instead of
 * behind it.
 *
 * ── Design notes ────────────────────────────────────────────────────────────
 * 1. The shapes are LARGE (46-62rem) and SATURATED, and are only lightly blurred
 *    (`blur-xl`/`blur-2xl`). An earlier version used `blur-3xl` on small shapes,
 *    which averaged four hues into a muddy olive wash. Softness now comes from
 *    the frosted panels sitting *on top*, not from destroying the shapes.
 * 2. "Flowing" is `background-position` on an oversized gradient
 *    (`bg-[size:220%_220%]` + `animate-flow`), which makes the COLOUR travel
 *    rather than just the element. `animate-tumble` adds a slow rotation, which
 *    drags the gradient round with it.
 * 3. Gradients repeat their first stop at the end so the pan loops seamlessly.
 * 4. Ambient motion is CSS, never Framer Motion: it should drift before
 *    hydration, and the global `prefers-reduced-motion` rule switches it off
 *    without any JavaScript.
 *
 * ── Why the shapes are wrapped in m.div ────────────────────────────────
 * Scroll parallax is applied to a WRAPPER, never to the shape itself. The shape
 * already animates `transform` via `animate-tumble`, and CSS animations outrank
 * inline styles in the cascade — so a Framer-written `translateY` on the same
 * element would simply be overwritten and the parallax would silently do
 * nothing. One element per job: the wrapper translates, the shape tumbles.
 */
/**
 * Pointer perturbation tuning.
 *
 * `SIGMA` is the radius (px) over which the cursor's influence falls off — a
 * Gaussian, so there is no hard edge where the effect switches on.
 * `GAIN` is the maximum displacement (px) a shape is pushed at zero distance.
 * The four gains differ, so the fields stir *relative to one another*; a single
 * shared gain would just slide the whole backdrop and read as a camera pan.
 */
const SIGMA = 620;
const GAINS = [62, 44, 74, 52] as const;

/**
 * Pointer springs are soft and heavy on purpose: water does not snap back, it
 * lags and settles. `restDelta` matters for cost — without a resting threshold the
 * springs would never stop integrating and the page would animate forever.
 */
const PUSH_SPRING = { stiffness: 42, damping: 20, mass: 1.1, restDelta: 0.08 };

export function Backdrop() {
  const noMotion = useNoMotion();
  const { scrollY } = useScroll();

  /*
   * Different speeds per shape are what make it read as depth rather than as the
   * whole background sliding. Values are small on purpose: the backdrop is
   * `fixed`, so large offsets would visibly detach it from the page.
   */
  const spring = { stiffness: 90, damping: 30, restDelta: 0.5 };
  const slow = useSpring(useTransform(scrollY, [0, 1400], [0, 70]), spring);
  const fast = useSpring(useTransform(scrollY, [0, 1400], [0, -110]), spring);
  const mid = useSpring(useTransform(scrollY, [0, 1400], [0, 46]), spring);
  const gentle = useSpring(useTransform(scrollY, [0, 1400], [0, 30]), spring);

  /*
   * A constant MotionValue rather than dropping the style prop, because
   * `MotionConfig` does not gate directly-driven MotionValues — the springs would
   * keep updating on every scroll event even with `reducedMotion="always"`.
   *
   * What Framer actually emits here is worth recording, because the obvious guess
   * is wrong: for an identity value it collapses the transform to
   * `transform: none`, NOT `translateY(0px)` (verified in the browser, not
   * assumed). That is normally the expensive shape — a large blurred element with
   * no transform cannot be reused as a composited layer and gets re-rasterised
   * every frame (measured at 236 -> 317 ms/s). It is harmless in this branch only
   * because the same "no motion" decision also switches the CSS animations off,
   * so there is nothing left to repaint.
   */
  const still = useTransform(scrollY, [0, 1], [0, 0]);

  // --- pointer perturbation -------------------------------------------------
  // Two springs for the whole backdrop, not two per shape: the per-shape offsets
  // are derived with plain `useTransform` maths, which costs nothing per frame.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const laggedX = useSpring(pointerX, PUSH_SPRING);
  const laggedY = useSpring(pointerY, PUSH_SPRING);

  /*
   * `strength` is what actually says "a cursor is present".
   *
   * The first version used `pointerX === 0 && pointerY === 0` as the sentinel for
   * "no cursor". That is wrong twice over:
   *
   *   - a spring settles to *within* `restDelta` of its target, not exactly on it,
   *     so after a pointer leave the value lands on something like 0.03 and the
   *     sentinel never fires;
   *   - the push magnitude comes from the Gaussian falloff, NOT from how far the
   *     cursor is from the origin — so a residual 0.03 is still "a cursor at the
   *     top-left corner" and produces a FULL ~57px shove. The effect never
   *     released, and every field stayed permanently displaced.
   *
   * A dedicated 0..1 strength, faded on a spring so the water settles rather than
   * snapping, fixes both. The final `v < 0.01 ? 0 : v` snap matters: it lets the
   * wrapper transforms return to exactly `none` at rest, instead of leaving a
   * 0.05px residual that keeps the element pinned as a composited layer.
   */
  const rawStrength = useMotionValue(0);
  const fadingStrength = useSpring(rawStrength, {
    stiffness: 70,
    damping: 26,
    restDelta: 0.001,
  });
  const strength = useTransform(fadingStrength, (v: number) => (v < 0.01 ? 0 : v));

  /*
   * Anchors are the shape centres pinned into the viewport. The fields are far
   * larger than the screen and mostly off it, so their raw centres can sit
   * hundreds of pixels outside — using those would make the cursor's influence
   * depend on geometry the visitor cannot see. Measured rather than derived from
   * the CSS offsets, and cached: the backdrop is `fixed`, so its layout only
   * changes on resize.
   */
  const shapeRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const anchors = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const measure = () => {
      anchors.current = shapeRefs.map((ref) => {
        const el = ref.current;
        if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const box = el.getBoundingClientRect();
        return {
          x: Math.min(Math.max(box.left + box.width / 2, 0), window.innerWidth),
          y: Math.min(Math.max(box.top + box.height / 2, 0), window.innerHeight),
        };
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // R1: no motion on phones, ever — and no pointer to speak of anyway.
    if (noMotion) {
      rawStrength.set(0);
      return;
    }
    // Only for devices that actually have a hovering cursor: on touch this would
    // fire during scroll and shove the background around under the reader's finger.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      // Coalesce to one update per frame: pointermove can fire far faster than the
      // display refreshes on a high-polling-rate mouse, and nothing here needs
      // sub-frame resolution.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        pointerX.set(event.clientX);
        pointerY.set(event.clientY);
        rawStrength.set(1);
      });
    };
    const onLeave = () => {
      rawStrength.set(0);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [noMotion, pointerX, pointerY, rawStrength]);

  /*
   * Displacement for one field, pushed directly AWAY from the cursor and scaled by
   * a Gaussian falloff, so a field the cursor is near moves and a distant one
   * barely notices.
   *
   * This is a plain function, not a hook factory: `useTransform` is called eight
   * times explicitly below. Calling a hook from inside a helper works only as long
   * as the call order never varies, which is exactly the kind of thing that breaks
   * silently later.
   *
   * `rawX === 0 && rawY === 0` means "no cursor" (the initial value, and the reset
   * on pointer leave) and must produce exactly zero offset — otherwise the
   * top-left corner would be treated as a permanently held cursor.
   */
  const offsetFor = (index: number, axis: 'x' | 'y', rawX: number, rawY: number, amount: number) => {
    if (amount <= 0) return 0;
    const anchor = anchors.current[index];
    if (!anchor) return 0;
    const dx = rawX - anchor.x;
    const dy = rawY - anchor.y;
    const distanceSq = dx * dx + dy * dy;
    const influence = Math.exp(-distanceSq / (2 * SIGMA * SIGMA));
    const distance = Math.sqrt(distanceSq) || 1;
    return ((axis === 'x' ? -dx : -dy) / distance) * influence * GAINS[index] * amount;
  };

  const pushX1 = useTransform([laggedX, laggedY, strength], ([x, y, s]: number[]) => offsetFor(0, 'x', x, y, s));
  const pushY1 = useTransform([laggedX, laggedY, strength], ([x, y, s]: number[]) => offsetFor(0, 'y', x, y, s));
  const pushX2 = useTransform([laggedX, laggedY, strength], ([x, y, s]: number[]) => offsetFor(1, 'x', x, y, s));
  const pushY2 = useTransform([laggedX, laggedY, strength], ([x, y, s]: number[]) => offsetFor(1, 'y', x, y, s));
  const pushX3 = useTransform([laggedX, laggedY, strength], ([x, y, s]: number[]) => offsetFor(2, 'x', x, y, s));
  const pushY3 = useTransform([laggedX, laggedY, strength], ([x, y, s]: number[]) => offsetFor(2, 'y', x, y, s));
  const pushX4 = useTransform([laggedX, laggedY, strength], ([x, y, s]: number[]) => offsetFor(3, 'x', x, y, s));
  const pushY4 = useTransform([laggedX, laggedY, strength], ([x, y, s]: number[]) => offsetFor(3, 'y', x, y, s));

  // Scroll parallax and the water push land on the same axis, so they are summed
  // into one MotionValue per wrapper. Under `noMotion` every push is already 0
  // (the pointer is never tracked), so only the parallax term needs gating.
  const y1 = useTransform([noMotion ? still : slow, pushY1], ([a, b]: number[]) => a + b);
  const y2 = useTransform([noMotion ? still : fast, pushY2], ([a, b]: number[]) => a + b);
  const y3 = useTransform([noMotion ? still : mid, pushY3], ([a, b]: number[]) => a + b);
  const y4 = useTransform([noMotion ? still : gentle, pushY4], ([a, b]: number[]) => a + b);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
    >
      {/* --- large flowing colour fields ------------------------------------
          On phones the composition is reduced from four overlapping fields to
          two, anchored to opposite corners. Four 46-62rem washes inside a 390px
          viewport overlap almost completely, and translucent overlaps average
          toward a muddy grey-green; two diagonal fields read as a deliberate
          gradient instead.

          `[animation-delay:-Ns]` staggers the water drift. The two tokens already
          run at different durations (43s / 61s), and the negative delay desyncs
          the fields that share a token — without it, shapes 1 and 3 would sway in
          lockstep and the motion would read as mechanical. A negative delay starts
          each field partway through the loop, which is exactly what is wanted. */}
      <m.div
        ref={shapeRefs[0]}
        style={{ x: pushX1, y: y1 }}
        className="absolute -top-[22rem] -left-[18rem] h-[62rem] w-[62rem] max-md:-top-[9rem] max-md:-left-[8rem] max-md:h-[28rem] max-md:w-[28rem]"
      >
        <div className="h-full w-full animate-flow-tumble-slow rounded-full bg-[linear-gradient(115deg,#6d5cff,#ff6b9d,#4ade9b,#6d5cff)] bg-[size:220%_220%] opacity-45 blur-xl [animation-delay:-7s] max-md:animate-none dark:opacity-35" />
      </m.div>

      <m.div
        ref={shapeRefs[1]}
        style={{ x: pushX2, y: y2 }}
        className="absolute -top-[16rem] -right-[22rem] h-[54rem] w-[54rem] max-md:hidden"
      >
        <div className="h-full w-full animate-flow-tumble rounded-full bg-[linear-gradient(200deg,#ff6b9d,#ffd166,#6d5cff,#ff6b9d)] bg-[size:220%_220%] opacity-40 blur-2xl [animation-delay:-23s] max-md:animate-none dark:opacity-30" />
      </m.div>

      <m.div
        ref={shapeRefs[2]}
        style={{ x: pushX3, y: y3 }}
        className="absolute -bottom-[24rem] -left-[16rem] h-[58rem] w-[58rem] max-md:-right-[9rem] max-md:-bottom-[8rem] max-md:left-auto max-md:h-[26rem] max-md:w-[26rem]"
      >
        <div className="h-full w-full animate-flow-tumble-slow rounded-full bg-[linear-gradient(60deg,#4ade9b,#6d5cff,#ff6b9d,#4ade9b)] bg-[size:220%_220%] opacity-35 blur-2xl [animation-delay:-31s] max-md:animate-none dark:opacity-28" />
      </m.div>

      {/* The one organic, non-circular shape.
          It USED to animate `border-radius` (a slow morph). That was the single
          most expensive thing in this file — measured at ~10% of the page's total
          continuous cost on its own (see STYLE-DIRECTIONS.md §7) — because a
          changing radius re-rasterises the shape every frame, whereas a transform
          or a background-position shift can be composited.

          Giving it a FIXED organic radius and letting it rotate + flow instead
          costs the same as not animating it at all (measured), so the motion is
          kept and only the expensive property was dropped.

          This one is now wrapped like the others so it takes part in the water
          drift and the pointer perturbation. Note its scroll parallax has a much
          smaller gain (`gentle`, 30px) than the circles — it was previously the
          only field WITHOUT parallax, and giving it the same travel as the big
          washes made it swing noticeably against them. */}
      <m.div
        ref={shapeRefs[3]}
        style={{ x: pushX4, y: y4 }}
        className="absolute top-[34%] -right-[16rem] h-[46rem] w-[46rem] max-md:hidden"
      >
        <div className="h-full w-full animate-flow-tumble-slow rounded-[42%_58%_55%_45%] bg-[linear-gradient(140deg,#ffd166,#4ade9b,#6d5cff,#ffd166)] bg-[size:220%_220%] opacity-35 blur-2xl [animation-delay:-13s] max-md:animate-none dark:opacity-25" />
      </m.div>

      {/* --- crisp outlines: geometry you can actually read ------------------
          Hidden below `lg` — at 390px they collide with the content column.
          `max-md:animate-none` is redundant with `hidden` today, and kept on
          purpose: if the hiding class is ever relaxed, the standing no-motion
          rule must not silently stop applying. scripts/unit-no-motion.mjs
          enforces the pairing for the same reason. */}
      <div className="absolute top-[15%] right-[13%] hidden h-28 w-28 animate-bob rounded-full border-[6px] border-iris/30 max-md:animate-none lg:block dark:border-iris/25" />
      <div className="absolute bottom-[22%] left-[8%] hidden h-16 w-16 rotate-12 animate-bob rounded-2xl border-[6px] border-blush/30 max-md:animate-none lg:block dark:border-blush/25" />

      {/* --- grid paper ------------------------------------------------------ */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(11,18,33,0.07)_1px,transparent_0)] bg-[size:24px_24px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(233,238,248,0.055)_1px,transparent_0)]" />

      {/* Film grain. Sits under the veil and under all content, so it textures the
          colour fields without ever putting noise behind text. See globals.css. */}
      <div className="grain-overlay absolute inset-0 opacity-[0.05] dark:opacity-[0.07]" />

      {/*
        Reading veil. Article and page bodies are not wrapped in a glass panel
        (see STYLE-DIRECTIONS.md D5), so they sit directly on this background.
        Without the veil, body copy would land on whatever colour a shape happens
        to be passing through.

        Deliberately a *vertical band* (linear, full height) rather than a
        centred radial ellipse: an ellipse fades out above and below its centre,
        so on a long article the top of the page would be veiled and the middle
        would not.

        On phones the veil is relaxed to 0.7 of that, because the mobile
        composition leaves the column itself as plain paper.
      */}
      <div className="absolute inset-y-0 left-1/2 w-[min(100vw,62rem)] -translate-x-1/2 bg-[linear-gradient(to_right,transparent_0%,rgba(247,244,238,0.45)_16%,rgba(247,244,238,0.72)_36%,rgba(247,244,238,0.72)_64%,rgba(247,244,238,0.45)_84%,transparent_100%)] max-md:opacity-70 dark:bg-[linear-gradient(to_right,transparent_0%,rgba(6,10,18,0.5)_16%,rgba(6,10,18,0.78)_36%,rgba(6,10,18,0.78)_64%,rgba(6,10,18,0.5)_84%,transparent_100%)]" />

      {/* --- vignette so the shapes sit on a surface ------------------------- */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-paper via-paper/60 to-transparent dark:from-midnight dark:via-midnight/60" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-paper via-paper/60 to-transparent dark:from-midnight dark:via-midnight/60" />
    </div>
  );
}
