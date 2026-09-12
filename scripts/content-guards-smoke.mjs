/**
 * Regression tests for the content safety nets.
 *
 * 1. `scripts/validate-content.mjs` must FAIL on MDX that cannot be parsed — this is what
 *    stops a misspelled attribute or an attribute/field type mismatch from shipping (TinaCMS
 *    replaces the whole body with an `invalid_markdown` node instead of erroring).
 * 2. A post marked `draft: true` must not be prerendered, so `draft` genuinely unpublishes
 *    instead of only hiding the post from lists.
 *
 * The validator reads the .mdx files directly, so these checks are deterministic and need no
 * content API. Only the draft build step requires the local API.
 *
 * Fixtures are written to content/posts/ and always removed, even on failure.
 *
 * Prerequisite for the draft check: `npm run dev` must be running. Use `npm run dev` rather
 * than `npx tinacms dev --noWatch`: that deprecated flag disables watching, so files created
 * while the API is up never get indexed and the draft check cannot be evaluated.
 * Usage: node scripts/content-guards-smoke.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const API = process.env.TINA_LOCAL_URL ?? 'http://localhost:4001/graphql';
const BROKEN_PATH = 'content/posts/__guard-broken-fixture.mdx';
const DRAFT_PATH = 'content/posts/__guard-draft-fixture.mdx';
const DRAFT_SLUG = '__guard-draft-fixture';
const BUILT_DIR = '.next/server/app/posts';

const brokenFixture = `---
title: 校验回归测试（应当失败）
date: '2026-01-01T00:00:00.000Z'
---

# 这份内容有问题

<Callout type="info" typo="oops" />
`;

const lowercaseFixture = `---
title: 小写组件名回归测试
date: '2026-01-01T00:00:00.000Z'
---

<callout type="info" />
`;

const draftFixture = `---
title: 草稿回归测试
date: '2026-01-01T00:00:00.000Z'
description: 这篇是草稿，不应出现在列表、sitemap、RSS，也不应可访问。
tags:
  - test
draft: true
---

# 这是草稿

不应该被发布。
`;

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const cleanup = () => {
  for (const path of [BROKEN_PATH, DRAFT_PATH]) {
    if (existsSync(path)) rmSync(path);
  }
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const runValidator = (extraArgs = []) =>
  spawnSync('node', ['scripts/validate-content.mjs', ...extraArgs], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
const builtPages = () => (existsSync(BUILT_DIR) ? readdirSync(BUILT_DIR) : []);

async function apiHasDocument(slug) {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ postConnection { edges { node { _sys { relativePath } } } } }' }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = await response.json();
  return (json?.data?.postConnection?.edges ?? []).some((edge) =>
    edge?.node?._sys?.relativePath?.includes(slug)
  );
}

try {
  cleanup();

  // --- 1. the validator accepts the real content -----------------------------
  const clean = runValidator();
  const cleanOutput = `${clean.stdout ?? ''}${clean.stderr ?? ''}`;
  check('validator accepts the current content', clean.status === 0, `exit=${clean.status}`);
  check('validator reports how many bodies it checked', /Checked \d+ rich-text body/.test(cleanOutput));

  // --- 2. the validator rejects unparseable MDX ------------------------------
  writeFileSync(BROKEN_PATH, brokenFixture, 'utf8');
  console.log(`\ncreated ${BROKEN_PATH}`);

  const broken = runValidator();
  const brokenOutput = `${broken.stdout ?? ''}${broken.stderr ?? ''}`;
  check('validator exits non-zero on unparseable MDX', broken.status !== 0, `exit=${broken.status}`);
  check(
    'failure names the offending property',
    /Unable to find field definition for property "typo"/.test(brokenOutput)
  );
  check('failure identifies the document', /__guard-broken-fixture/.test(brokenOutput));
  check(
    'failure explains that the whole body was replaced',
    /invalid_markdown/.test(brokenOutput)
  );

  // --- 3. lowercase component names are flagged in strict mode ---------------
  writeFileSync(BROKEN_PATH, lowercaseFixture, 'utf8');
  const lenient = runValidator();
  const strict = runValidator(['--strict']);
  const lenientOutput = `${lenient.stdout ?? ''}${lenient.stderr ?? ''}`;
  check('lowercase component name warns without --strict', lenient.status === 0, `exit=${lenient.status}`);
  check('warning shows the raw node', /Raw HTML nodes/.test(lenientOutput));
  check('lowercase component name fails with --strict', strict.status !== 0, `exit=${strict.status}`);

  cleanup();
  check('validator passes again after fixtures are removed', runValidator().status === 0);

  // --- 4. a draft must not be prerendered ------------------------------------
  writeFileSync(DRAFT_PATH, draftFixture, 'utf8');
  console.log(`created ${DRAFT_PATH}`);

  // Wait for the API to index the fixture; the draft assertion below is only meaningful
  // if the API actually knows about it (the build reads content through that API).
  let indexed = false;
  for (let attempt = 0; attempt < 20 && !indexed; attempt += 1) {
    await wait(2000);
    indexed = await apiHasDocument(DRAFT_SLUG);
  }
  check(
    'draft fixture is indexed by the local API',
    indexed,
    indexed ? '' : 'is the API running via `npm run dev`? --noWatch disables content indexing'
  );

  console.log('\nrunning the offline build (validates content, then builds)...\n');
  const build = spawnSync('node', ['scripts/build-local.mjs'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  check('offline build succeeded', build.status === 0, `exit=${build.status}`);

  const after = builtPages();
  check(
    'no page was generated for the draft',
    !after.some((file) => file.includes(DRAFT_SLUG)),
    after.filter((file) => file.includes(DRAFT_SLUG)).join(', ') || 'absent'
  );
  check(
    'published posts were still generated',
    after.some((file) => file.includes('hello-tinacms'))
  );
} catch (error) {
  check('content guards test completed', false, error.message);
} finally {
  cleanup();
  const leftover = [BROKEN_PATH, DRAFT_PATH].filter((path) => existsSync(path));
  console.log(`\ncleanup: ${leftover.length === 0 ? 'ok' : `FAILED — ${leftover.join(', ')}`}`);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
