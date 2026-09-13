export type CalloutType = 'info' | 'warning' | 'success' | 'danger';

/**
 * ── READ BEFORE EDITING ──────────────────────────────────────────────────────
 * `scripts/interaction-smoke.mjs` asserts the *literal* class names
 * `border-sky-300` (info) and `border-amber-300` (warning) on the rendered
 * `<aside>`. They are therefore load-bearing selectors, not decoration: retuning
 * the colour is fine, deleting the class is not.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Glass fill (`/80` + `backdrop-blur-xl`, applied in the component) inside a
 * thick, saturated Neo-Brutalist outline. The hard shadow lives on the component
 * too, so the variants below only carry the variant-specific colour.
 */
export const calloutStyles: Record<CalloutType, string> = {
  info: 'border-sky-300 bg-sky-50/80 text-sky-950 dark:border-sky-300/60 dark:bg-sky-500/10 dark:text-sky-50',
  warning:
    'border-amber-300 bg-amber-50/80 text-amber-950 dark:border-amber-300/60 dark:bg-amber-500/10 dark:text-amber-50',
  success:
    'border-emerald-300 bg-emerald-50/80 text-emerald-950 dark:border-emerald-300/60 dark:bg-emerald-500/10 dark:text-emerald-50',
  danger:
    'border-rose-300 bg-rose-50/80 text-rose-950 dark:border-rose-300/60 dark:bg-rose-500/10 dark:text-rose-50',
};

/** The accent square in the label row, plus the corner glow. */
export const calloutAccents: Record<CalloutType, string> = {
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  danger: 'bg-rose-500',
};

export const calloutLabels: Record<CalloutType, string> = {
  info: '提示',
  warning: '注意',
  success: '成功',
  danger: '警告',
};
