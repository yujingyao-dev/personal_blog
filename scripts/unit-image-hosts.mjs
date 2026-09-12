/**
 * Unit tests for the image-host matcher and the link sanitizer.
 *
 * Both decide behaviour that fails silently when wrong:
 *  - an over-permissive image matcher sends URLs the optimizer rejects (broken image, HTTP 200)
 *  - an under-permissive one disables optimization without anyone noticing
 *  - a wrong link sanitizer either lets `javascript:` through or turns valid links into text
 *
 * The image expectations below were corrected against Next's own matcher, which compiles the
 * hostname with picomatch: `**.vercel.app` requires at least one label, so it does NOT match
 * the bare hostname `vercel.app`. An earlier hand-rolled matcher in this repo claimed it did.
 *
 * Usage: node --experimental-strip-types --no-warnings scripts/unit-image-hosts.mjs
 */
import {
  ALLOWED_IMAGE_HOSTS,
  isAllowedImageHost,
  isUrlAllowedForOptimizer,
  remotePatternsFromAllowlist,
} from '../src/lib/image-hosts.ts';
import { sanitizeUrl } from '../src/components/mdx/sanitize-url.ts';

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// --- image host matching ----------------------------------------------------
const hostCases = [
  // [hostname, expected, why]
  ['assets.tina.io', true, 'exact allowlist entry'],
  ['ASSETS.TINA.IO', true, 'hostnames are compared lowercase'],
  ['my-blog.vercel.app', true, 'picomatch ** does match labels before .vercel.app'],
  ['a.b.vercel.app', true, 'more labels still match'],
  ['vercel.app', false, 'the bare domain does not match (verified against picomatch)'],
  ['example.com', false, 'not listed'],
  ['evil.com', false, 'not listed'],
  ['assets.tina.io.evil.com', false, 'suffix spoofing must not match'],
  ['notassets.tina.io', false, 'subdomains of an exact entry are not implied'],
  ['xvercel.app', false, 'no label boundary before .vercel.app'],
];

for (const [hostname, expected, why] of hostCases) {
  const actual = isAllowedImageHost(hostname);
  check(
    `${hostname} -> ${expected}`,
    actual === expected,
    `${why}${actual !== expected ? ` (got ${actual})` : ''}`
  );
}

check('allowlist is non-empty', ALLOWED_IMAGE_HOSTS.length > 0, ALLOWED_IMAGE_HOSTS.join(', '));
check(
  'every allowlist entry is a plausible host pattern',
  ALLOWED_IMAGE_HOSTS.every((host) => /^(\*\*?\.)?[a-z0-9.-]+$/i.test(host)),
  ALLOWED_IMAGE_HOSTS.join(', ')
);

// Every expectation below was checked against picomatch
// (`next/dist/compiled/picomatch`), which is what Next uses.
const asyncCases = [
  ['https://assets.tina.io/a/b.png', true],
  ['https://my-blog.vercel.app/a.png', true],
  ['https://vercel.app/a.png', false],
  ['https://example.com/a.png', false],
];
for (const [url, expected] of asyncCases) {
  const actual = isUrlAllowedForOptimizer(new URL(url));
  check(`isUrlAllowedForOptimizer(${url}) -> ${expected}`, actual === expected, `got ${actual}`);
}

const protocolMismatch = isUrlAllowedForOptimizer(new URL('http://assets.tina.io/a.png'));
check('http is rejected when the pattern requires https', protocolMismatch === false, `got ${protocolMismatch}`);

// --- link sanitizer ---------------------------------------------------------
const urlCases = [
  // [input, expected-substring-or-null, why]
  ['https://example.com/page', 'example.com', 'plain https link'],
  ['/posts/hello', '/posts/hello', 'relative link'],
  ['#section', '#section', 'anchor'],
  ['mailto:me@example.com', 'mailto:me@example.com', 'mailto'],
  ['tel:+8613800000000', 'tel:', 'tel'],
  ['xref:some-reference', 'xref', 'CMS cross-reference scheme must survive'],
  ['javascript:alert(1)', null, 'javascript: must be rejected'],
  ['data:text/html;base64,PHNjcmlwdD4=', null, 'data: must be rejected'],
  ['', null, 'empty'],
  [null, null, 'null'],
];

for (const [input, expected, why] of urlCases) {
  const actual = sanitizeUrl(input);
  const passed = expected === null ? actual === undefined : Boolean(actual && actual.includes(expected));
  check(`sanitizeUrl(${JSON.stringify(input)})`, passed, `${why}${passed ? '' : ` (got ${JSON.stringify(actual)})`}`);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
