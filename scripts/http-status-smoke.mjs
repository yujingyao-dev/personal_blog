/**
 * Regression tests for HTTP status codes.
 *
 * Why this exists: the Tina client's default `errorPolicy: 'throw'` rejects on ANY GraphQL
 * error, including the "Unable to find record" error a missing document produces. That made
 * every unknown post URL return **500 instead of 404**, because `notFound()` was never
 * reached. The client now uses `errorPolicy: 'include'` (see src/lib/tina.ts) so a missing
 * record resolves to a null post.
 *
 * Runs against whatever server the given base URL points at, so it works against both
 * `npm run dev` (default port 3000) and a production `next start`.
 *
 * Usage: node scripts/http-status-smoke.mjs [baseUrl]
 */
const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function status(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  // Drain the body so the connection can be reused.
  await response.text().catch(() => {});
  return response.status;
}

try {
  const cases = [
    { path: '/', expected: 200, label: 'home' },
    { path: '/posts', expected: 200, label: 'post list' },
    { path: '/posts/hello-tinacms', expected: 200, label: 'published post' },
    { path: '/about', expected: 200, label: 'about page' },
    { path: '/rss.xml', expected: 200, label: 'rss feed' },
    { path: '/sitemap.xml', expected: 200, label: 'sitemap' },
    { path: '/robots.txt', expected: 200, label: 'robots' },
    { path: '/admin/index.html', expected: 200, label: 'tina admin' },
  ];

  for (const testCase of cases) {
    const actual = await status(testCase.path);
    check(`${testCase.label} (${testCase.path}) → ${testCase.expected}`, actual === testCase.expected, `got ${actual}`);
  }

  // The regression this file exists for.
  const missing = await status('/posts/definitely-not-a-real-post');
  check('unknown post returns 404, not 500', missing === 404, `got ${missing}`);

  const missingNested = await status('/posts/nested/also-missing');
  check('unknown nested post returns 404', missingNested === 404, `got ${missingNested}`);
} catch (error) {
  check('http status test completed', false, error.message);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
