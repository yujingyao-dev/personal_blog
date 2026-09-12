/**
 * Regression test: a post marked `draft: true` must not be publicly reachable.
 *
 * Before this was fixed, `generateStaticParams` ignored the draft flag, so a draft was
 * hidden from the lists/sitemap/RSS but still prerendered and served at its own URL.
 *
 * The test temporarily creates a draft post, runs the full offline build, and asserts that
 * no page was generated for it — that is the behaviour that actually matters. The fixture
 * file is always removed, even on failure.
 *
 * Prerequisite: the local content API (`npm run dev` or `npx tinacms dev --noWatch`).
 * Usage: node scripts/draft-smoke.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const SLUG = '__draft-regression-test';
const DRAFT_PATH = `content/posts/${SLUG}.mdx`;
const BUILT_DIR = '.next/server/app/posts';

const draftContent = `---
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
  if (existsSync(DRAFT_PATH)) rmSync(DRAFT_PATH);
};

const builtPages = () => (existsSync(BUILT_DIR) ? readdirSync(BUILT_DIR) : []);

try {
  cleanup();
  const baseline = builtPages();
  console.log(`baseline built pages: ${baseline.join(', ') || '(none)'}`);

  writeFileSync(DRAFT_PATH, draftContent, 'utf8');
  console.log(`created ${DRAFT_PATH}`);

  // The local API watches content/; give it a moment to index the new file.
  await new Promise((resolve) => setTimeout(resolve, 7000));

  const response = await fetch('http://localhost:4001/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '{ postConnection { edges { node { title draft _sys { relativePath } } } } }',
    }),
  });
  const json = await response.json();
  const edges = json?.data?.postConnection?.edges ?? [];
  const draftEdge = edges.find((edge) => edge?.node?._sys?.relativePath?.includes(SLUG));
  check('fixture draft is indexed by the local API', Boolean(draftEdge), draftEdge?.node?.title ?? 'not found');
  check('fixture draft has draft: true', draftEdge?.node?.draft === true);

  console.log('\nrunning the offline build (this also regenerates the client)...\n');
  const build = spawnSync('node', ['scripts/build-local.mjs'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  check('offline build succeeded', build.status === 0);

  const after = builtPages();
  console.log(`built pages after adding the draft: ${after.join(', ') || '(none)'}`);
  check(
    'no page was generated for the draft',
    !after.some((file) => file.includes(SLUG)),
    after.filter((file) => file.includes(SLUG)).join(', ') || 'absent'
  );
  check(
    'published posts were still generated',
    after.some((file) => file.includes('hello-tinacms'))
  );
} catch (error) {
  check('draft regression test completed', false, error.message);
} finally {
  cleanup();
  console.log(`\ncleanup: ${existsSync(DRAFT_PATH) ? 'FAILED — file still present' : 'ok'}`);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
