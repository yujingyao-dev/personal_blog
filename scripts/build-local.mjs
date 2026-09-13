/**
 * Offline static build: generate a LOCAL Tina client, then run `next build` against the
 * already-running local content API. Lets you verify the static build and rendering
 * pipeline without a TinaCloud account.
 *
 * Why this exists instead of a plain npm script:
 *   `tinacms build --local` always TRIES to start its own Tina dev server (ports 4001)
 *   and datalayer server (port 9000). When the API is already running — which it must be,
 *   since `next build` reads content from it — that attempt dies with
 *   "Datalayer server is busy on port 9000" and a non-zero exit code, even though it has
 *   already written tina/__generated__/client.ts pointing at the local API.
 *   This script treats that specific failure as expected, verifies the client really is
 *   local, and only then runs `next build`.
 *
 * Prerequisite: the local content API must be running (`npm run dev`, or
 * `npx tinacms dev --noWatch`). `scripts/check-local-api.mjs` verifies this first.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const run = (command, args) =>
  spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

// 1. The local API must be up — produce a clear error otherwise.
if (run('node', ['scripts/check-local-api.mjs']).status !== 0) {
  process.exit(1);
}

// 2. Generate the local client. A failure caused by our own running server is expected.
console.log('\n→ tinacms build --local (generating a local client)\n');
const tina = run('npx', ['tinacms', 'build', '--local', '--skip-cloud-checks', '--noTelemetry']);

const clientSource = readFileSync('tina/__generated__/client.ts', 'utf8');
const pointsAtLocalApi = /url:\s*'http:\/\/localhost:\d+\/graphql'/.test(clientSource);

if (!pointsAtLocalApi) {
  console.error(
    '\n✖ The generated client does not point at a local API, so `next build` would try to\n' +
      '  reach TinaCloud. Aborting to avoid producing a broken build.\n' +
      `  Generated: ${clientSource.split('\n')[2] ?? '(unknown)'}`
  );
  process.exit(1);
}

if (tina.status !== 0) {
  console.log(
    '  (tinacms exited non-zero — expected: it could not start its own servers because\n' +
      '   yours are already running. The local client was generated, continuing.)'
  );
}

// 2b. Validate that every rich-text body actually parses. TinaCMS replaces a whole body
//     with an `invalid_markdown` node when parsing fails, which would otherwise ship
//     silently. Reads the .mdx files directly, so it needs no API and matches the check
//     that runs in the production build.
console.log('\n→ validating content (MDX bodies)\n');
const validate = run('node', ['scripts/validate-content.mjs', '--strict']);
if (validate.status !== 0) {
  console.error('\n✖ Aborting the build: fix the content problems reported above.\n');
  process.exit(validate.status ?? 1);
}

// 3. Build the site against the local API.
console.log('\n→ next build (against the local content API)\n');
const next = run('npx', ['next', 'build']);
if (next.status !== 0) process.exit(next.status ?? 1);

// 4. Post-build assertions. `--require-bundles` because here the client bundles ARE expected:
//    locally a missing bundle set means the check silently skipped itself, not that the CI
//    filesystem pruned them. `npm run build` intentionally omits the flag for that reason.
console.log('\n→ runtime independence + route contract\n');
const runtime = run('node', ['scripts/runtime-independence-smoke.mjs', '--require-bundles']);
const routes = run('node', ['scripts/route-contract-smoke.mjs', '--require-artifacts']);
process.exit(runtime.status !== 0 ? (runtime.status ?? 1) : (routes.status ?? 1));
