/**
 * Offline contract test: every post URL the site *emits* must match a page the site
 * *generates*.
 *
 * This class of bug is invisible to the smoke suites, because they only ever request URLs the
 * test itself constructs. The concrete case this caught: the post detail route was a single
 * dynamic segment (`[filename]`) while lists/sitemap/RSS emitted the full path within the
 * collection. A post in a subfolder was therefore listed as `/posts/2026/nested-post` but
 * prerendered as `/posts/2026%2Fnested-post.html`, so the link 404'd.
 *
 * Runs against the build output only — no server, no API. Run `npm run build:local` first.
 *
 * Usage: node scripts/route-contract-smoke.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = '.next/server/app';
const POSTS_DIR = join(APP_DIR, 'posts');
/** Treat missing build output as a failure instead of a skip (build:local passes this). */
const requireArtifacts = process.argv.includes('--require-artifacts');

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/** Every prerendered post page, as a URL path (e.g. "/posts/2026/nested-post"). */
/**
 * Every prerendered post page, as a URL path (e.g. "/posts/2026/nested-post").
 *
 * IMPORTANT: a dynamic route with `dynamicParams` left at its default also writes entries here
 * for paths that were requested at runtime and resolved to 404 — serving the HTTP status test
 * leaves `/posts/definitely-not-a-real-post` behind. Those are NOT pages the site publishes, so
 * they must be excluded from the "everything generated is in the sitemap" direction.
 * Next records the distinction in the sibling `.meta` file as `"status":404`.
 */
function isPublishedPage(dir, baseName) {
  const meta = join(dir, `${baseName}.meta`);
  if (!existsSync(meta)) return true; // no metadata written -> treat as a real page
  try {
    const parsed = JSON.parse(readFileSync(meta, 'utf8'));
    // Verified against real build output: a genuinely prerendered page omits `status`
    // entirely, while a runtime-served 404 records `"status":404`. So only an explicit
    // non-200 status excludes the route.
    if (typeof parsed.status === 'number' && parsed.status !== 200) return false;
    return true;
  } catch {
    return true;
  }
}

function prerenderedPostRoutes(dir = POSTS_DIR, prefix = '') {
  if (!existsSync(dir)) return [];
  const routes = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      routes.push(...prerenderedPostRoutes(join(dir, entry.name), `${prefix}/${entry.name}`));
    } else if (entry.name.endsWith('.html')) {
      const baseName = entry.name.replace(/\.html$/, '');
      if (!isPublishedPage(dir, baseName)) continue;
      routes.push(`/posts${prefix}/${baseName}`);
    }
  }
  return routes;
}

/** Extract hrefs from a prerendered HTML file. */
function hrefsFrom(file, pattern = /href="(\/posts\/[^"#?]*)"/g) {
  if (!existsSync(file)) return [];
  const html = readFileSync(file, 'utf8');
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function locsFrom(file, tag = 'loc') {
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, 'utf8');
  return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))].map((match) => match[1]);
}

try {
  const prerendered = prerenderedPostRoutes();

  // A sibling check once failed a Vercel deploy by treating "artifacts not where I assumed" as a
  // site defect. The assertions below compare emitted URLs against generated pages, so they need
  // the generated output; without it there is nothing to compare and this must not block a deploy.
  if (prerendered.length === 0 && !requireArtifacts) {
    console.warn(
      `⚠  No prerendered post pages found under ${POSTS_DIR} — the route contract checks were\n` +
        '   NOT evaluated. Expected on a CI filesystem that keeps only the deployment output.\n' +
        '   Use --require-artifacts to treat this as a failure (that is what build:local does).'
    );
    console.log('\n0/0 checks passed (skipped)');
    process.exit(0);
  }

  console.log(`prerendered post routes: ${prerendered.join(', ') || '(none)'}`);
  check('at least one post was prerendered', prerendered.length > 0);

  // 1. No route may contain an encoded path separator. A `%2F` route means the dynamic
  //    segment cannot match the emitted URL — this is the exact regression.
  const encoded = prerendered.filter((route) => /%2F/i.test(route));
  check(
    'no prerendered route contains an encoded slash',
    encoded.length === 0,
    encoded.join(', ') || 'none'
  );

  // 2. Every link on the post list page must resolve to a prerendered route.
  const listHrefs = [...new Set(hrefsFrom(join(APP_DIR, 'posts.html')))];
  console.log(`links on /posts: ${listHrefs.join(', ') || '(none)'}`);
  const unroutableList = listHrefs.filter((href) => !prerendered.includes(href));
  check(
    'every link on the post list page has a generated page',
    unroutableList.length === 0,
    unroutableList.join(', ') || 'all resolve'
  );

  // 3. Same for the home page's recent-posts links.
  const homeHrefs = [...new Set(hrefsFrom(join(APP_DIR, 'index.html')))];
  const unroutableHome = homeHrefs.filter((href) => !prerendered.includes(href));
  check(
    'every post link on the home page has a generated page',
    unroutableHome.length === 0,
    unroutableHome.join(', ') || 'all resolve'
  );

  // 4. The sitemap must agree with the prerendered routes.
  const sitemapPaths = locsFrom(join(APP_DIR, 'sitemap.xml.body'))
    .map((loc) => {
      try {
        return new URL(loc).pathname;
      } catch {
        return loc;
      }
    })
    .filter((path) => path.startsWith('/posts/'));
  const unroutableSitemap = sitemapPaths.filter((path) => !prerendered.includes(path));
  console.log(`sitemap post paths: ${sitemapPaths.join(', ') || '(none)'}`);
  check(
    'every sitemap post URL has a generated page',
    unroutableSitemap.length === 0,
    unroutableSitemap.join(', ') || 'all resolve'
  );

  // 5. RSS must agree too.
  const rssPaths = locsFrom(join(APP_DIR, 'rss.xml.body'), 'link')
    .map((link) => {
      try {
        return new URL(link).pathname;
      } catch {
        return link;
      }
    })
    .filter((path) => path.startsWith('/posts/'));
  const unroutableRss = rssPaths.filter((path) => !prerendered.includes(path));
  check(
    'every rss item URL has a generated page',
    unroutableRss.length === 0,
    unroutableRss.join(', ') || 'all resolve'
  );

  // 6. Nothing prerendered should be missing from the sitemap either (the reverse mismatch).
  const missingFromSitemap = prerendered.filter((route) => !sitemapPaths.includes(route));
  check(
    'every prerendered post is present in the sitemap',
    missingFromSitemap.length === 0,
    missingFromSitemap.join(', ') || 'all present'
  );
} catch (error) {
  check('route contract test completed', false, error.message);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
