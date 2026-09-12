/**
 * Verifies the editor's WRITE path: saving in the TinaCMS admin must persist to the .mdx
 * file on disk.
 *
 * Every other test covers read paths. This one covers the actual promise of local editing:
 *   open document -> change a field -> Save -> git-tracked file changes -> revert.
 *
 * It restores the original title at the end (via the editor itself, so a failure leaves the
 * change visible in `git diff` rather than silently discarding it).
 *
 * Prerequisite: `npm run dev`.
 * Usage: node scripts/save-smoke.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const POST_FILE = 'content/posts/hello-tinacms.mdx';
const ORIGINAL_TITLE = '使用 TinaCMS 搭建静态博客';
const MARKER = '（保存测试）';

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

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

const fileHas = (needle) => readFileSync(POST_FILE, 'utf8').includes(needle);
const UI = async () => (await page.locator('body').innerText()).replace(/\n{2,}/g, '\n');

/** Open the demo post in the admin editor. */
async function openDocument() {
  await page.goto(`${baseUrl}/admin/index.html`, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForSelector('#modal-root', { state: 'attached', timeout: 60_000 });
  await page.waitForTimeout(8000);

  const enterEditMode = page.getByRole('button', { name: /enter edit mode/i }).first();
  if (await enterEditMode.count()) {
    await enterEditMode.click();
    await page.waitForTimeout(4000);
  }

  await page.locator('button[aria-label="Open navigation menu"]').first().evaluate((el) => el.click());
  await page.waitForTimeout(2500);
  await page.getByText('博客文章', { exact: false }).first().click();
  await page.waitForTimeout(3000);
  await page.getByText('使用 TinaCMS 搭建静态博客', { exact: false }).first().click();
  await page.waitForTimeout(7000);
}

/** Find the title text input inside the form. */
function titleInput() {
  return page
    .locator('input[type="text"], input:not([type])')
    .filter({ hasNot: page.locator('[readonly]') })
    .first();
}

async function clickSave() {
  const saveButton = page.getByRole('button', { name: /^Save$/ }).first();
  await saveButton.scrollIntoViewIfNeeded().catch(() => {});
  await saveButton.click({ force: true }).catch(async () => {
    await saveButton.evaluate((el) => el.click());
  });
}

try {
  check('fixture file starts with the expected title', fileHas(ORIGINAL_TITLE));

  await openDocument();
  const editorText = await UI();
  check('document opened in the editor', /博客文章\s*\/\s*hello-tinacms/.test(editorText));

  // --- edit the title and save ---------------------------------------------
  const input = titleInput();
  const inputCount = await input.count();
  check('title input found', inputCount > 0);
  if (inputCount === 0) throw new Error('could not locate the title input');

  const currentValue = await input.inputValue();
  check('title input holds the current title', currentValue.includes(ORIGINAL_TITLE), currentValue);

  await input.fill(`${ORIGINAL_TITLE}${MARKER}`);
  await page.waitForTimeout(1000);
  await clickSave();
  await page.waitForTimeout(8000);

  const saved = fileHas(MARKER);
  check('edit was written to the .mdx file on disk', saved, saved ? `"${MARKER}" present` : 'not present');
  if (saved) {
    console.log('--- frontmatter title line ---');
    console.log(
      readFileSync(POST_FILE, 'utf8')
        .split(/\r?\n/)
        .find((line) => line.startsWith('title:')) ?? '(none)'
    );
  }

  // --- revert through the editor -------------------------------------------
  if (saved) {
    const revertInput = titleInput();
    await revertInput.fill(ORIGINAL_TITLE);
    await page.waitForTimeout(1000);
    await clickSave();
    await page.waitForTimeout(8000);

    const reverted = !fileHas(MARKER) && fileHas(ORIGINAL_TITLE);
    check('title reverted through the editor', reverted);
  }
} catch (error) {
  check('save test completed', false, error.message);
} finally {
  console.log('\n--- non-404 console errors ---');
  console.log(consoleErrors.length ? consoleErrors.slice(0, 10).join('\n') : '(none)');
  await browser.close();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
