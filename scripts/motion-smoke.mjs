/**
 * Runtime gate for the STANDING RULE "mobile gets no motion" (STYLE-DIRECTIONS.md §0 / R1).
 *
 * `scripts/unit-no-motion.mjs` checks the SOURCE (the CSS rule exists, the hooks
 * are wired, `useNoMotion()` is used where it must be). That is necessary but not
 * sufficient: it reasons about code, not about what the browser actually does. A
 * Framer animation reached by some path the source rules do not recognise, or a
 * CSS animation that slips past the media query, would pass every source check and
 * still move on a phone.
 *
 * This closes that hole by measuring the rendered result. It takes a freeze-frame
 * of every element's computed transform / opacity / background-position, waits,
 * and asserts NOTHING changed. A positive control on desktop asserts the same
 * measurement DOES see motion — without it, a broken test that always compares two
 * empty strings would look like a pass.
 *
 * Deliberately does NOT assert "no transform anywhere": the illustrations use
 * static `translate(7,7)` shadow offsets, the card tilt carries
 * `perspective(1000px)`, and the reading-progress bar rests at `scaleX(0)`. None
 * of those are motion, and forbidding them would make the rule about the wrong
 * thing.
 *
 * Usage: node scripts/motion-smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** Below Tailwind's `md`, where the rule applies. */
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const ROUTES = ['/', '/posts', '/posts/hello-tinacms', '/about', '/no-such-page'];

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/** Every element's motion-relevant computed style, concatenated. */
const snapshot = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .map((el) => {
        const cs = getComputedStyle(el);
        return `${cs.transform}|${cs.opacity}|${cs.backgroundPosition}`;
      })
      .join('\u0001')
  );

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

try {
  // --- mobile: frozen ------------------------------------------------------
  for (const route of ROUTES) {
    const context = await browser.newContext({ viewport: MOBILE });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'load', timeout: 60_000 });
    // Long enough for every entrance animation to have finished and any
    // continuous animation to be well under way.
    await page.waitForTimeout(2500);

    const animating = await page.evaluate(
      () =>
        [...document.querySelectorAll('*')].filter((el) => {
          const cs = getComputedStyle(el);
          return (
            (cs.animationName && cs.animationName !== 'none') ||
            (cs.transitionDuration && cs.transitionDuration !== '0s')
          );
        }).length
    );
    check(`mobile ${route}: nothing declares an animation`, animating === 0, `${animating} elements`);

    const before = await snapshot(page);
    await page.waitForTimeout(800);
    const after = await snapshot(page);
    check(
      `mobile ${route}: frame is frozen`,
      before === after && before.length > 0,
      before === after ? `${before.length} chars identical` : 'SOMETHING MOVED'
    );

    await context.close();
  }

  // --- desktop positive control -------------------------------------------
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(2500);
  const before = await snapshot(page);
  await page.waitForTimeout(800);
  const after = await snapshot(page);
  check(
    'control: the measurement detects motion on desktop',
    before !== after,
    before === after ? 'FROZEN — this test is measuring nothing' : 'changes detected'
  );
  await context.close();
} catch (error) {
  check('motion smoke completed', false, error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
