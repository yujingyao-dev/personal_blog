/**
 * Headless test for the interactive custom components on the *published* static page.
 *
 * Verifies the behaviours curl cannot: the Counter actually increments/decrements on
 * click, it persists to localStorage, and the Tabs switch panels.
 *
 * Usage: node scripts/interaction-smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const POST_URL = `${baseUrl}/posts/hello-tinacms`;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/404/.test(m.text())) consoleErrors.push(m.text());
});

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  await page.goto(POST_URL, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(2500);

  // --- Counter interaction --------------------------------------------------
  const increase = page.getByRole('button', { name: '增加' }).first();
  const decrease = page.getByRole('button', { name: '减少' }).first();
  check('counter renders both buttons', (await increase.count()) > 0 && (await decrease.count()) > 0);

  const readCount = async () =>
    Number(await page.locator('strong.tabular-nums').first().innerText());
  const start = await readCount();
  await increase.click();
  await increase.click();
  await page.waitForTimeout(400);
  const afterPlus = await readCount();
  check('counter increments on click', afterPlus === start + 2, `${start} → ${afterPlus}`);

  await decrease.click();
  await page.waitForTimeout(400);
  const afterMinus = await readCount();
  check('counter decrements on click', afterMinus === afterPlus - 1, `${afterPlus} → ${afterMinus}`);

  // --- Persistence across a reload -----------------------------------------
  const stored = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((k) => k.startsWith('mdx:counter:'));
    return key ? { key, value: window.localStorage.getItem(key) } : null;
  });
  check('counter value persisted to localStorage', Boolean(stored), stored ? stored.key : 'no key');

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const afterReload = await readCount();
  check('counter restored after reload', afterReload === afterMinus, `${afterMinus} → ${afterReload}`);

  // --- Tabs switching -------------------------------------------------------
  const tabs = page.getByRole('tab');
  const tabCount = await tabs.count();
  check('tabs rendered', tabCount >= 2, `count=${tabCount}`);

  const panel = page.getByRole('tabpanel').first();
  const firstPanel = await panel.innerText();
  await tabs.nth(1).click();
  await page.waitForTimeout(500);
  const secondPanel = await panel.innerText();
  check(
    'clicking a tab switches the panel content',
    firstPanel.trim() !== secondPanel.trim() && secondPanel.length > 0,
    `${JSON.stringify(firstPanel.slice(0, 30))} → ${JSON.stringify(secondPanel.slice(0, 30))}`
  );
  check(
    'active tab reflects selection',
    (await tabs.nth(1).getAttribute('aria-selected')) === 'true'
  );

  // --- Callout nesting ------------------------------------------------------
  check('callout renders with nested rich text', (await page.locator('aside').count()) >= 2);
  check(
    'callout variants applied',
    (await page.locator('aside.border-sky-300').count()) > 0 &&
      (await page.locator('aside.border-amber-300').count()) > 0
  );

  // --- Figure ---------------------------------------------------------------
  const figure = page.locator('figure').first();
  check('figure renders', (await figure.count()) > 0);
  const figureImage = figure.locator('img').first();
  check('figure image has a src', ((await figureImage.getAttribute('src')) ?? '').length > 0);
  check(
    'figure caption renders',
    (await figure.locator('figcaption').count()) > 0 && ((await figure.locator('figcaption').innerText()).length > 0)
  );
  check(
    'figure image actually loads',
    await figureImage.evaluate((img) => img.complete && img.naturalWidth > 0)
  );

  // --- VideoEmbed -----------------------------------------------------------
  const iframe = page.locator('iframe').first();
  check('video embed renders an iframe', (await iframe.count()) > 0);
  const src = (await iframe.getAttribute('src')) ?? '';
  check('video embed src is a provider embed URL', /youtube-nocookie\.com\/embed\//.test(src), src);
  check('video embed has an accessible title', ((await iframe.getAttribute('title')) ?? '').length > 0);
} catch (error) {
  check('interaction test completed', false, error.message);
} finally {
  console.log('\n--- console errors ---');
  console.log(consoleErrors.length ? consoleErrors.slice(0, 10).join('\n') : '(none)');
  await browser.close();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
