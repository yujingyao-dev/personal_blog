/**
 * Offline check that the deployed site carries no runtime dependency on TinaCMS.
 *
 * This matters for the Vercel deployment: the public pages must work even if the content API
 * is unreachable, slow, or rate-limited. If a client bundle fetched content, visitors would
 * see failures caused entirely by the CMS backend.
 *
 * Evidence checked, all from the build output (no server or network needed):
 *  1. the prerendered post HTML already contains the post's real content
 *  2. no client bundle references the content API, sends an API key, or issues a content query
 *  3. the routes are recorded as static/SSG with a revalidate window, not as dynamic
 *
 * Run `npm run build:local` first.
 *
 * Usage: node scripts/runtime-independence-smoke.mjs [slug]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = '.next/server/app';
const CHUNKS_DIR = '.next/static/chunks';
const MANIFEST = '.next/prerender-manifest.json';
const slug = process.argv[2] ?? 'hello-tinacms';

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

function allChunkFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return allChunkFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

try {
  // --- 1. content is baked into the HTML ------------------------------------
  const postHtmlPath = join(APP_DIR, 'posts', `${slug}.html`);
  if (!existsSync(postHtmlPath)) {
    check(`prerendered HTML exists for /posts/${slug}`, false, 'run npm run build:local first');
  } else {
    const html = readFileSync(postHtmlPath, 'utf8');
    check(`prerendered HTML exists for /posts/${slug}`, true);
    // The demo post's own strings: if content were fetched at runtime these would be absent.
    const baked = ['欢迎', '提示框组件', '交互组件'].filter((needle) => html.includes(needle));
    check(
      'post content is present in the static HTML',
      baked.length >= 2,
      `found ${baked.length}/3 markers`
    );
    check(
      'no loading placeholder is rendered instead of content',
      !/正在加载|loading\.\.\.|Loading post/i.test(html)
    );
  }

  // --- 2. client bundles are free of content-API usage ----------------------
  const chunks = allChunkFiles(CHUNKS_DIR);
  check('client chunks were found', chunks.length > 0, `${chunks.length} files`);

  const apiPatterns = [
    { label: 'content API host', pattern: /content\.tinajs\.io/ },
    { label: 'API key header', pattern: /X-API-KEY/ },
    { label: 'generated client', pattern: /createClient\s*\(\s*\{[^}]*url:/ },
    { label: 'content query', pattern: /postConnection|pageConnection/ },
    { label: 'collection path lookup', pattern: /relativePath/ },
  ];

  for (const { label, pattern } of apiPatterns) {
    const offenders = chunks.filter((file) => pattern.test(readFileSync(file, 'utf8')));
    check(
      `no client chunk contains a ${label}`,
      offenders.length === 0,
      offenders.map((file) => file.split(/[\\/]/).pop()).join(', ') || 'clean'
    );
  }

  // --- 3. routes are static, not dynamic ------------------------------------
  if (!existsSync(MANIFEST)) {
    check('prerender manifest exists', false, 'run npm run build:local first');
  } else {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    const routes = manifest.routes ?? {};
    const dynamic = manifest.dynamicRoutes ?? {};

    const postRoute = `/posts/${slug}`;
    check(
      `${postRoute} is prerendered (static or SSG)`,
      Boolean(routes[postRoute]),
      Object.keys(routes).includes(postRoute) ? '' : 'not in manifest.routes'
    );
    check(
      `${postRoute} declares a revalidate window`,
      typeof routes[postRoute]?.initialRevalidateSeconds === 'number',
      String(routes[postRoute]?.initialRevalidateSeconds)
    );
    check(
      'the post route is not served by a dynamic handler',
      !dynamic[postRoute],
      dynamic[postRoute] ? 'present in dynamicRoutes' : 'not dynamic'
    );

    const staticRoutes = ['/', '/posts', '/about', '/sitemap.xml', '/rss.xml'];
    const missing = staticRoutes.filter((route) => !routes[route] && !dynamic[route]);
    check('all static content routes are in the manifest', missing.length === 0, missing.join(', ') || 'all present');
  }
} catch (error) {
  check('runtime independence check completed', false, error.message);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
