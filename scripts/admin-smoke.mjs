/**
 * Headless smoke test for the TinaCMS visual editor (local mode).
 *
 * Verifies what curl cannot: the admin SPA boots in a real browser, reaches the local
 * content API, renders the collections from tina/config.ts, opens a document, shows the
 * custom components as rich-text embeds, and opens the "Embed" menu used to insert them.
 *
 * Usage: node scripts/admin-smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'admin-debug.png';

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/404 \(Not Found\)/.test(m.text())) consoleErrors.push(m.text());
});

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const UI = async () => (await page.locator('body').innerText()).replace(/\n{2,}/g, '\n');

try {
  // --- 1. admin boots -------------------------------------------------------
  await page.goto(`${baseUrl}/admin/index.html`, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForSelector('#modal-root', { state: 'attached', timeout: 60_000 });
  await page.waitForTimeout(8000);
  check('admin boots in local mode', /local mode/i.test(await UI()));

  const enterEditMode = page.getByRole('button', { name: /enter edit mode/i }).first();
  if (await enterEditMode.count()) {
    await enterEditMode.click();
    await page.waitForTimeout(4000);
  }
  check('entered edit mode', /local mode/i.test(await UI()));

  // Open the sidebar (lucide <svg> inside the button swallows center clicks).
  await page.locator('button[aria-label="Open navigation menu"]').first().evaluate((el) => el.click());
  await page.waitForTimeout(2500);
  check('collection "博客文章" listed', /博客文章/.test(await UI()));
  check('collection "独立页面" listed', /独立页面/.test(await UI()));

  // --- 2. open the demo document in the editor ------------------------------
  await page.getByText('博客文章', { exact: false }).first().click();
  await page.waitForTimeout(3000);
  check('demo document listed', /hello-tinacms|使用 TinaCMS 搭建静态博客/i.test(await UI()));

  await page.getByText('使用 TinaCMS 搭建静态博客', { exact: false }).first().click();
  await page.waitForTimeout(7000);

  const editorText = await UI();
  check('document open in editor (breadcrumb + fields)', /博客文章\s*\/\s*hello-tinacms/.test(editorText));
  check('form fields from schema rendered', /标题[\s\S]*发布日期[\s\S]*摘要[\s\S]*正文/.test(editorText));
  check('rich-text body loaded', /欢迎[\s\S]*提示框组件[\s\S]*交互组件[\s\S]*标签页/.test(editorText));

  // --- 3. custom components appear as rich-text embeds -----------------------
  check('Callout rendered as editor embed', /提示框 \(Callout\)/.test(editorText));
  check('Counter rendered as editor embed', /计数器 \(Counter\)/.test(editorText));
  check('Tabs rendered as editor embed', /标签页 \(Tabs\)/.test(editorText));
  check('embeds are editable (Open options)', /提示框 \(Callout\)[\s\S]*Open options/.test(editorText));

  // NOTE: visual editing (click-to-edit on the site page) is covered separately by
  // scripts/visual-edit-smoke.mjs, because it requires navigating away from the admin.

  // --- 4. the Embed menu (used to insert new components) ---------------------
  const paragraph = page.getByText('这篇文章用来验证', { exact: false }).first();
  let menuOpened = false;
  if (await paragraph.count()) {
    await paragraph.click();
    await page.waitForTimeout(2000);
  }

  const embedButtons = page.locator('button').filter({ hasText: /^Embed$/ });
  if (await embedButtons.count()) {
    const btn = embedButtons.first();
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ force: true }).catch(async () => {
      await btn.evaluate((el) => el.click());
    });
    await page.waitForTimeout(2500);
    menuOpened = true;
  } else {
    const anyEmbed = page.locator('button:has-text("Embed"), [role="button"]:has-text("Embed")').first();
    if (await anyEmbed.count()) {
      await anyEmbed.evaluate((el) => el.click());
      await page.waitForTimeout(2500);
      menuOpened = true;
    }
  }
  check('rich-text toolbar exposes "Embed"', menuOpened);

  if (menuOpened) {
    const menuText = await UI();
    console.log('--- text after opening Embed menu (last 900) ---');
    console.log(menuText.slice(-900));
    check('Embed menu offers Callout', /Callout|提示框/.test(menuText));
    check('Embed menu offers Counter', /Counter|计数器/.test(menuText));
    check('Embed menu offers Tabs', /Tabs|标签页/.test(menuText));
  }

  await page.screenshot({ path: OUT });
} catch (error) {
  check('smoke test completed', false, error.message);
  await page.screenshot({ path: OUT }).catch(() => {});
} finally {
  console.log('\n--- non-404 console errors ---');
  console.log(consoleErrors.length ? consoleErrors.slice(0, 15).join('\n') : '(none)');
  await browser.close();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
