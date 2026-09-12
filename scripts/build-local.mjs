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

// 3. Build the site against the local API.
console.log('\n→ next build (against the local content API)\n');
const next = run('npx', ['next', 'build']);
process.exit(next.status ?? 1);
