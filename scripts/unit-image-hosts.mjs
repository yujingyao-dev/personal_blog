/**
 * Unit tests for the image-host allowlist.
 *
 * This predicate decides whether a content-authored remote image goes through Next's image
 * optimizer. Getting it wrong is quiet: an allowed-but-wrong answer produces
 * `400 "url" parameter is not allowed` and a broken image, and a too-permissive answer lets
 * arbitrary hosts into the optimizer.
 *
 * Runs with plain `node` (Node >= 22 strips TypeScript types natively; see the npm script,
 * which passes --experimental-strip-types for explicitness).
 *
 * Usage: node --experimental-strip-types scripts/unit-image-hosts.mjs
 */
import { ALLOWED_IMAGE_HOSTS, isAllowedImageHost } from '../src/lib/image-hosts.ts';

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const cases = [
  // [hostname, expected, why]
  ['assets.tina.io', true, 'exact allowlist entry'],
  ['ASSETS.TINA.IO', true, 'case-insensitive'],
  ['my-blog.vercel.app', true, 'wildcard subdomain match'],
  ['vercel.app', true, 'wildcard matches the bare domain too'],
  ['a.b.vercel.app', true, 'nested subdomain still matches'],
  ['example.com', false, 'not listed'],
  ['evil.com', false, 'not listed'],
  ['assets.tina.io.evil.com', false, 'suffix spoofing must not match'],
  ['notassets.tina.io', false, 'subdomain of a listed host is not implied by an exact entry'],
  ['example.com.vercel.app', true, 'a genuine vercel subdomain'],
  ['localhost', false, 'local host'],
  ['', false, 'empty hostname'],
];

for (const [hostname, expected, why] of cases) {
  const actual = isAllowedImageHost(hostname);
  check(`${hostname || '(empty)'} -> ${expected}`, actual === expected, `${why}${actual !== expected ? ` (got ${actual})` : ''}`);
}

// The allowlist must not be empty, and every entry must be a plausible host pattern.
check('allowlist is non-empty', ALLOWED_IMAGE_HOSTS.length > 0, ALLOWED_IMAGE_HOSTS.join(', '));
check(
  'every allowlist entry is a hostname pattern',
  ALLOWED_IMAGE_HOSTS.every((host) => /^(\*\*?\.)?[a-z0-9.-]+$/i.test(host)),
  ALLOWED_IMAGE_HOSTS.join(', ')
);

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
