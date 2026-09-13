/**
 * Verifies how the site origin resolves from the environment, before a custom domain exists.
 *
 * The site origin feeds canonical / og:url / og:image, sitemap.xml, robots.txt and rss.xml, so
 * getting it wrong is a silent SEO failure (localhost links baked into a deployed site).
 *
 * Usage: node --experimental-strip-types --no-warnings scripts/unit-site-url.mjs
 */
import { siteUrl } from '../src/lib/site.ts';

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/** Run `siteUrl()` with a clean environment containing only the given variables. */
function resolveWith(env) {
  const KEYS = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL',
    'VERCEL_URL',
  ];
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
  Object.assign(process.env, env);

  const result = siteUrl();

  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  return result;
}

const cases = [
  {
    name: 'explicit site url wins',
    env: {
      NEXT_PUBLIC_SITE_URL: 'https://blog.example.com',
      NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'my-blog.vercel.app',
    },
    expected: 'https://blog.example.com',
  },
  {
    name: 'empty string falls through to the Vercel domain',
    env: { NEXT_PUBLIC_SITE_URL: '', NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'my-blog.vercel.app' },
    expected: 'https://my-blog.vercel.app',
  },
  {
    name: 'unset falls through to the Vercel domain',
    env: { NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'my-blog.vercel.app' },
    expected: 'https://my-blog.vercel.app',
  },
  {
    name: 'a single space falls through too',
    env: { NEXT_PUBLIC_SITE_URL: ' ', NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'my-blog.vercel.app' },
    expected: 'https://my-blog.vercel.app',
  },
  {
    name: 'trailing slashes are trimmed',
    env: { NEXT_PUBLIC_SITE_URL: 'https://blog.example.com///' },
    expected: 'https://blog.example.com',
  },
  {
    name: 'preview fallback uses VERCEL_URL when the production url is missing',
    env: { VERCEL_URL: 'my-blog-abc123.vercel.app' },
    expected: 'https://my-blog-abc123.vercel.app',
  },
  {
    name: 'local development falls back to localhost',
    env: {},
    expected: 'http://localhost:3000',
  },
];

for (const { name, env, expected } of cases) {
  const actual = resolveWith(env);
  check(name, actual === expected, actual === expected ? actual : `expected ${expected}, got ${actual}`);
}

// The one genuinely dangerous combination: no site url AND no Vercel domain resolves to
// localhost, which is fine locally but would bake localhost links into a deploy.
const localhost = resolveWith({ NEXT_PUBLIC_TINA_CLIENT_ID: 'x' });
check(
  'with nothing set, the result is localhost (must be caught by check:env on Vercel)',
  localhost === 'http://localhost:3000',
  localhost
);

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
