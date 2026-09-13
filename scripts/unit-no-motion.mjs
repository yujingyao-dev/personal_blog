/**
 * Offline gate for the STANDING RULE "mobile gets no motion" (STYLE-DIRECTIONS.md §0 / R1).
 *
 * The rule needs four coordinated changes, and three of them are in ordinary
 * source files that a future edit can quietly undo:
 *
 *   1. the CSS media query in globals.css
 *   2. `MotionConfig reducedMotion="always"` in motion-provider.tsx
 *   3. `useNoMotion()` in every component that drives a MotionValue or animates
 *   4. `max-md:animate-none` on continuously-animating elements
 *
 * Nothing in the type system or the build enforces any of it. Forgetting #3 is
 * the nastiest case: `MotionConfig` does not gate directly-driven MotionValues,
 * so a `useSpring`-based animation keeps running on phones while every other
 * check still passes. That is exactly the bug this file exists to prevent.
 *
 * Deliberately offline and dependency-free (reads files, needs no build) so it can
 * run in `npm run test:unit` alongside the other guards.
 *
 * Usage: node scripts/unit-no-motion.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const SRC = 'src';

/** Every source file under src/, as repo-relative POSIX-ish paths. */
function sourceFiles(dir = SRC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|css)$/.test(entry.name) ? [full.replace(/\\/g, '/')] : [];
  });
}

const files = sourceFiles();
const read = (file) => readFileSync(file, 'utf8');

/**
 * Animation utilities that run FOREVER, as opposed to the one-shot entrance
 * utilities (`animate-rise`, `animate-rule`, `animate-pop`). Only the continuous
 * ones need an explicit mobile opt-out: the one-shot ones are already switched off
 * by the global mobile rule, and they fall back to a visible base style.
 */
const CONTINUOUS_ANIMATIONS = [
  'animate-blob',
  'animate-blob-slow',
  'animate-drift',
  'animate-flow',
  'animate-flow-slow',
  'animate-tumble',
  'animate-tumble-slow',
  'animate-flow-tumble',
  'animate-flow-tumble-slow',
  'animate-morph',
  'animate-morph-flow',
  'animate-bob',
  'animate-spin-slow',
  'animate-sheen',
];

/** Hooks that drive a MotionValue directly — invisible to `MotionConfig`. */
const MOTION_VALUE_HOOKS = ['useScroll', 'useSpring'];

// --- 1. globals.css still carries the mobile kill switch --------------------
{
  const css = read(`${SRC}/app/globals.css`);
  const block = /@media \(width < 48rem\)\s*\{([\s\S]*?)\n\}/.exec(css);
  check('globals.css has a `width < 48rem` block', Boolean(block));
  check(
    'that block disables animation and transition',
    Boolean(block) && /animation:\s*none\s*!important/.test(block[1]) && /transition:\s*none\s*!important/.test(block[1])
  );
}

// --- 2. the provider still routes through the shared decision ---------------
{
  const provider = read(`${SRC}/components/site/motion-provider.tsx`);
  check('motion-provider uses useNoMotion()', /useNoMotion\(\)/.test(provider));
  check(
    'motion-provider sets reducedMotion="always" when motion is off',
    /reducedMotion=\{noMotion \? 'always' : 'user'\}/.test(provider)
  );
  check('motion-provider keeps LazyMotion strict', /<LazyMotion[^>]*\bstrict\b/.test(provider));
}

// --- 3. useReducedMotion is only allowed in the one sanctioned file ---------
{
  const offenders = files.filter(
    (file) =>
      !file.endsWith('use-no-motion.ts') &&
      /^\s*import[^;]*\buseReducedMotion\b[^;]*from\s*['"]framer-motion['"]/m.test(read(file))
  );
  check(
    'useReducedMotion is only imported by use-no-motion.ts',
    offenders.length === 0,
    offenders.join(', ') || 'clean'
  );
}

// --- 4. anything driving a MotionValue also consults useNoMotion ------------
{
  const offenders = [];
  for (const file of files) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    const source = read(file);
    const drives = MOTION_VALUE_HOOKS.some((hook) => new RegExp(`\\b${hook}\\s*[(<]`).test(source));
    if (!drives) continue;
    // The hook file itself defines the decision; it may legitimately read the media query.
    if (file.endsWith('use-no-motion.ts')) continue;
    if (!/useNoMotion\s*\(/.test(source)) offenders.push(file);
  }
  check(
    'every MotionValue-driving file calls useNoMotion()',
    offenders.length === 0,
    offenders.join(', ') || 'clean'
  );
}

// --- 5. continuous animations opt out below md ------------------------------
{
  const offenders = [];
  for (const file of files) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    const lines = read(file).split('\n');
    lines.forEach((line, index) => {
      // A CSS animation utility appearing in a string/className on this line.
      const used = CONTINUOUS_ANIMATIONS.filter((name) => new RegExp(`\\b${name}\\b`).test(line));
      // `animate-flow-tumble` is a prefix of `animate-flow-tumble-slow`; keep only the longest match.
      const longest = used.filter((name) => !used.some((other) => other !== name && other.startsWith(name)));
      if (longest.length === 0) return;
      // Comments and prose are not classNames.
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
      if (!/max-md:animate-none/.test(line)) {
        offenders.push(`${file}:${index + 1} (${longest.join(', ')})`);
      }
    });
  }
  check(
    'continuous animations carry max-md:animate-none',
    offenders.length === 0,
    offenders.join('; ') || 'clean'
  );
}

// --- 6. never-ending Framer animations must consult useNoMotion ------------
// `MotionConfig reducedMotion="always"` only suppresses transform and layout
// animations — opacity and colour animations keep running. So an infinite Framer
// loop (a pulsing dot, a shimmer) would silently animate on phones while rules
// 1-5 all still passed.
//
// ⚠️ KNOWN LIMITATION, verified by injecting a regression: this rule only catches
// a file that has NO `useNoMotion()` call at all. It cannot tell whether a
// SPECIFIC animation is gated by that call, so adding an ungated infinite opacity
// loop to a file that already calls `useNoMotion()` slips through. Static analysis
// cannot resolve that without evaluating the render.
//
// That case is caught by `scripts/motion-smoke.mjs`, which measures the rendered
// page and fails if anything on a phone changes between two frames. The two gates
// are complementary: this one is offline and points at the offending file, that
// one is authoritative but needs a browser. Keep both.
{
  const offenders = [];
  for (const file of files) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    const source = read(file);
    if (!/framer-motion/.test(source)) continue;
    const repeats = /\brepeat\s*:\s*(Infinity|Number\.POSITIVE_INFINITY|Number\.MAX_SAFE_INTEGER)/.test(source);
    if (!repeats) continue;
    if (/useNoMotion\s*\(/.test(source)) continue;
    offenders.push(file);
  }
  check(
    'infinite Framer animations are gated by useNoMotion()',
    offenders.length === 0,
    offenders.join(', ') || 'clean (see the limitation note above)'
  );
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
