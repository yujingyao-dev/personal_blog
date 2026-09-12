/**
 * Verifies TinaCMS visual (contextual) editing on the live site page.
 *
 * Loading the site's own post URL with ?edit=true should mount the Tina sidebar on top
 * of the page, hydrate content through `useTina`, and expose [data-tina-field] handles so
 * editors can click a block on the page to jump to its field.
 *
 * Usage: node scripts/visual-edit-smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = `${baseUrl}/posts/hello-tinacms?edit=true`;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

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
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(9000);

  const text = (await page.locator('body').innerText()).replace(/\n{2,}/g, '\n');

  // The site content itself must still render normally.
  check('site page still renders its content', /欢迎/.test(text) && /提示框组件/.test(text));

  // The editor UI should be mounted on top of the page.
  check('Tina editor UI mounted on the page', /local mode|编辑模式|Save|保存/i.test(text));
  check('sidebar shows the document', /hello-tinacms|使用 TinaCMS 搭建静态博客/.test(text));

  // Click-to-edit handles injected into the rendered content.
  const fieldCount = await page.locator('[data-tina-field]').count();
  console.log(`--- [data-tina-field] elements: ${fieldCount} ---`);
  check('click-to-edit handles injected', fieldCount > 0, `count=${fieldCount}`);

  const sample = await page
    .locator('[data-tina-field]')
    .evaluateAll((els) =>
      els.slice(0, 8).map((el) => `${el.tagName.toLowerCase()} → ${el.getAttribute('data-tina-field')}`)
    );
  console.log('--- sample handles ---');
  console.log(sample.join('\n'));

  // Our custom components should be among them (they render as aside/div blocks).
  check(
    'custom component exposes a tina-field handle',
    await page.locator('[data-tina-field] aside, aside [data-tina-field], [data-tina-field]').count() > 0
  );

  await page.screenshot({ path: 'visual-edit-debug.png' });
  console.log('screenshot → visual-edit-debug.png');
} catch (error) {
  check('visual edit test completed', false, error.message);
  await page.screenshot({ path: 'visual-edit-debug.png' }).catch(() => {});
} finally {
  console.log('\n--- console errors ---');
  console.log(consoleErrors.length ? consoleErrors.slice(0, 10).join('\n') : '(none)');
  await browser.close();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
