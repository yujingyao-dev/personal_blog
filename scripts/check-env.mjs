/**
 * Preflight check for the TinaCMS environment variables.
 *
 * The TinaCMS admin is a statically built SPA: `NEXT_PUBLIC_TINA_CLIENT_ID` is baked into
 * public/admin/assets/*.js at build time. If Vercel builds without it (or with the
 * placeholder from .env.example), the deployed editor points at a project that does not
 * exist and fails in the browser with a confusing error. This script fails the build
 * early with an actionable message instead.
 *
 * Usage:
 *   node scripts/check-env.mjs            # warns only (local development)
 *   node scripts/check-env.mjs --strict   # fails the build (used by `npm run build`)
 *
 * `.env` is loaded because TinaCMS only reads plain `.env` (not `.env.local`/`.env.development`),
 * and because `TINA_TOKEN` from a non-public file must still reach `tinacms build`.
 */
import { readFileSync, existsSync } from 'node:fs';

const strict = process.argv.includes('--strict');

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Vercel injects real environment variables; .env is the local source of truth.
loadEnvFile('.env');

const PLACEHOLDER_CLIENT_ID = '00000000-0000-0000-0000-000000000000';
const PLACEHOLDER_TOKEN = 'local-placeholder-token';

const errors = [];
const warnings = [];

const clientId = (process.env.NEXT_PUBLIC_TINA_CLIENT_ID ?? '').trim();
const token = (process.env.TINA_TOKEN ?? '').trim();
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

if (!clientId) {
  errors.push('NEXT_PUBLIC_TINA_CLIENT_ID is not set — the editor will not know which project to load.');
} else if (clientId === PLACEHOLDER_CLIENT_ID) {
  errors.push(
    `NEXT_PUBLIC_TINA_CLIENT_ID is still the placeholder (${PLACEHOLDER_CLIENT_ID}). ` +
      'Set the real Client ID from https://app.tina.io (Project → Overview).'
  );
}

if (!token) {
  errors.push('TINA_TOKEN is not set — content queries will fail with HTTP 401.');
} else if (token === PLACEHOLDER_TOKEN) {
  errors.push(
    'TINA_TOKEN is still the placeholder. Set the real Read Only token ' +
      '(Project → Tokens).'
  );
}

if (!process.env.NEXT_PUBLIC_TINA_BRANCH && !process.env.VERCEL_GIT_COMMIT_REF && !process.env.HEAD) {
  warnings.push('No branch resolved; tina/config.ts will fall back to "main".');
}

if (!process.env.NEXT_PUBLIC_SITE_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  warnings.push(
    'NEXT_PUBLIC_SITE_URL is unset and VERCEL_PROJECT_PRODUCTION_URL is unavailable — ' +
      'sitemap.xml / robots.txt / rss.xml will contain http://localhost:3000.'
  );
}

for (const warning of warnings) console.warn(`⚠  ${warning}`);

if (errors.length > 0) {
  const label = strict ? '✖ Build configuration invalid' : '✖ TinaCMS environment not configured yet';
  console.error(`\n${label}:`);
  for (const error of errors) console.error(`   • ${error}`);
  console.error(
    '\nFor local development without a TinaCloud account, use `npm run build:local`, ' +
      'which builds against the local content API.\n'
  );
  if (strict) process.exit(1);
  process.exit(0);
}

console.log(
  `✔ TinaCMS environment looks good (clientId …${clientId.slice(-8)}, ` +
    `token …${token.slice(-4)}${isVercel ? ', Vercel' : ''}).`
);
