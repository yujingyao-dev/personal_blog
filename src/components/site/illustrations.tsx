/**
 * Illustration set — the third Neo-Brutalist pillar.
 *
 * The site previously had plenty of abstract geometry but no actual
 * illustration. These are hand-built SVG "stickers" in the same visual language
 * as the rest of the theme:
 *
 *   - a thick single-weight ink outline (chalk in dark mode), round joins
 *   - flat, saturated fills drawn from the four accent tokens
 *   - a hard offset drop shadow with zero blur, matching `--shadow-brutal-*`
 *
 * They are `aria-hidden`: every one of them sits next to real text that carries
 * the meaning, so announcing them would only add noise for screen readers.
 *
 * Sizing is the caller's job — pass a width/height via `className`.
 */

/** A four-point concave sparkle, built from straight segments. */
function sparklePath(cx: number, cy: number, r: number) {
  const w = r * 0.3;
  return [
    `M${cx},${cy - r}`,
    `L${cx + w},${cy - w}`,
    `L${cx + r},${cy}`,
    `L${cx + w},${cy + w}`,
    `L${cx},${cy + r}`,
    `L${cx - w},${cy + w}`,
    `L${cx - r},${cy}`,
    `L${cx - w},${cy - w}`,
    'Z',
  ].join(' ');
}

/** Shared paint attributes so every sticker lines up visually. */
const OUTLINE = 'stroke-ink dark:stroke-chalk';
const SHADOW = 'fill-ink/20 dark:fill-chalk/15';

/**
 * An open (and conspicuously empty) isometric box, with a couple of sparkles
 * drifting out of it. Used for empty states.
 */
export function EmptyBox({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 190"
      aria-hidden
      focusable="false"
      className={className}
      strokeWidth={5}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <g transform="translate(8,8)" className={SHADOW} stroke="none">
        <path d="M110 42 L176 74 L110 106 L44 74 Z" />
        <path d="M44 74 L110 106 L110 168 L44 136 Z" />
        <path d="M176 74 L110 106 L110 168 L176 136 Z" />
      </g>

      {/* Opening (the lid is off, so the box reads as empty rather than full) */}
      <path d="M110 42 L176 74 L110 106 L44 74 Z" className="fill-sun" />
      <path d="M44 74 L110 106 L110 168 L44 136 Z" className="fill-blush" />
      <path d="M176 74 L110 106 L110 168 L176 136 Z" className="fill-iris" />

      <g className={OUTLINE} fill="none">
        <path d="M110 42 L176 74 L110 106 L44 74 Z" />
        <path d="M44 74 L110 106 L110 168 L44 136 Z" />
        <path d="M176 74 L110 106 L110 168 L176 136 Z" />
      </g>

      <g className="fill-mint stroke-ink dark:stroke-chalk" strokeWidth={4}>
        <path d={sparklePath(74, 22, 17)} />
        <path d={sparklePath(140, 30, 11)} />
      </g>
    </svg>
  );
}

/**
 * A paper plane with a dashed, looping trail — it has clearly gone somewhere and
 * not arrived. Used for the 404 page.
 */
export function LostPlane({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 190"
      aria-hidden
      focusable="false"
      className={className}
      strokeWidth={5}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Trail first, so the plane sits on top of it. */}
      <path
        d="M14 150 C 46 142, 34 108, 62 100 C 84 94, 78 130, 100 126"
        fill="none"
        strokeDasharray="12 14"
        className="stroke-ink/35 dark:stroke-chalk/30"
      />

      <g transform="translate(8,8)" className={SHADOW} stroke="none">
        <path d="M198 30 L42 78 L112 96 Z" />
        <path d="M198 30 L112 96 L86 156 Z" />
      </g>

      <path d="M198 30 L42 78 L112 96 Z" className="fill-sun" />
      <path d="M198 30 L112 96 L86 156 Z" className="fill-blush" />

      <g className={OUTLINE} fill="none">
        <path d="M198 30 L42 78 L112 96 Z" />
        <path d="M198 30 L112 96 L86 156 Z" />
      </g>

      <g className="fill-iris stroke-ink dark:stroke-chalk" strokeWidth={4}>
        <path d={sparklePath(212, 96, 15)} />
        <path d={sparklePath(150, 146, 11)} />
      </g>

      <rect
        x="24"
        y="34"
        width="22"
        height="22"
        rx="6"
        transform="rotate(-14 35 45)"
        className="fill-mint stroke-ink dark:stroke-chalk"
        strokeWidth={4}
      />
    </svg>
  );
}

/**
 * A magnifier over an empty page — for "this filter matched nothing", which is a
 * different situation from "there are no posts at all" and deserves a different
 * picture. Reusing EmptyBox here would read as though the blog were empty.
 */
export function EmptySearch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 200"
      aria-hidden
      focusable="false"
      className={className}
      strokeWidth={5}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <g transform="translate(8,8)" className={SHADOW} stroke="none">
        <rect x="42" y="30" width="118" height="140" rx="12" />
        <circle cx="176" cy="132" r="34" />
      </g>

      {/* The page */}
      <rect x="42" y="30" width="118" height="140" rx="12" className="fill-white dark:fill-slate-800" />
      <g className={OUTLINE} fill="none">
        <rect x="42" y="30" width="118" height="140" rx="12" />
      </g>
      {/* Ruled lines, stopping short of the bottom to leave room for the glass */}
      <g className="stroke-ink/30 dark:stroke-chalk/30" strokeWidth="4" strokeLinecap="round">
        <path d="M64 62h74M64 84h74M64 106h48" />
      </g>

      {/* Magnifier */}
      <circle cx="176" cy="132" r="34" className="fill-mint/45" />
      <g className={OUTLINE} fill="none">
        <circle cx="176" cy="132" r="34" />
        <path d="M200 158l22 22" strokeWidth="9" />
      </g>

      <path d={sparklePath(196, 34, 15)} className="fill-sun stroke-ink dark:stroke-chalk" strokeWidth={4} />
    </svg>
  );
}

/**
 * A tight cluster of the site's four shape motifs. Used as a hero accent where
 * a full illustration would compete with the headline.
 */
export function SparkleCluster({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 130 130"
      aria-hidden
      focusable="false"
      className={className}
      strokeWidth={5}
      strokeLinejoin="round"
    >
      <g transform="translate(7,7)" className={SHADOW} stroke="none">
        <path d={sparklePath(58, 52, 34)} />
        <circle cx="26" cy="100" r="14" />
        <rect x="88" y="88" width="28" height="28" rx="9" />
        <path d={sparklePath(106, 24, 16)} />
      </g>

      <g className="stroke-ink dark:stroke-chalk">
        <path d={sparklePath(58, 52, 34)} className="fill-sun" />
        <circle cx="26" cy="100" r="14" className="fill-mint" />
        <rect x="88" y="88" width="28" height="28" rx="9" className="fill-iris" />
        <path d={sparklePath(106, 24, 16)} className="fill-blush" />
      </g>
    </svg>
  );
}
