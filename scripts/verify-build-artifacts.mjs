/**
 * Post-build verification of the artifacts `tinacms build` produced.
 *
 * `tinacms build` can exit 0 while producing artifacts that are wrong for the environment,
 * and both failure modes are silent until someone opens the deployed editor:
 *
 *  - a client pointing at `http://localhost:4001` (leaked from a `--local` build) means every
 *    content query on the deployed site fails
 *  - the admin at `public/admin/index.html` is dev-mode markup that loads its assets from
 *    `http://localhost:4001`, which is what `tinacms dev` writes; the production SPA is a
 *    different file. Deploying that working tree ships an editor that cannot load
 *
 * Read-only: it inspects the artifacts and reports. `npm run build` runs it in `--strict`
 * mode (failures abort the deploy); run it bare to just look.
 *
 * Usage: node scripts/verify-build-artifacts.mjs [--strict]
 */
import { readFileSync, existsSync } from 'node:fs';

const strict = process.argv.includes('--strict');

const CLIENT_PATH = 'tina/__generated__/client.ts';
const ADMIN_INDEX = 'public/admin/index.html';

const errors = [];
const notes = [];

// --- generated client -------------------------------------------------------
if (!existsSync(CLIENT_PATH)) {
  errors.push(`${CLIENT_PATH} is missing — run \`tinacms build\` (it is generated, not committed).`);
} else {
  const client = readFileSync(CLIENT_PATH, 'utf8');

  const pointsAtLocalhost = /url:\s*'https?:\/\/localhost/.test(client);
  const pointsAtCloud = /url:\s*'https:\/\/content\.tinajs\.io/.test(client);

  if (pointsAtLocalhost) {
    errors.push(
      `${CLIENT_PATH} points at a localhost API. Every content query would fail on the deployed\n` +
        '     site. This happens when the last build ran with `--local`; re-run without it.'
    );
  } else if (!pointsAtCloud) {
    notes.push(
      `${CLIENT_PATH} does not reference content.tinajs.io — confirm this is intended\n` +
        '     (a self-hosted content API would also look like this).'
    );
  }

  // A placeholder client id baked into the client means the env was not configured.
  if (/00000000-0000-0000-0000-000000000000/.test(client)) {
    errors.push(
      `${CLIENT_PATH} contains the placeholder client id — set NEXT_PUBLIC_TINA_CLIENT_ID.`
    );
  }
}

// --- admin SPA --------------------------------------------------------------
if (!existsSync(ADMIN_INDEX)) {
  notes.push(`${ADMIN_INDEX} is missing — the editor will 404 at /admin/index.html.`);
} else {
  const admin = readFileSync(ADMIN_INDEX, 'utf8');
  const isDevMarkup = /localhost:4001|@react-refresh|\/src\/main\.tsx/.test(admin);

  if (isDevMarkup) {
    errors.push(
      `${ADMIN_INDEX} is DEV-mode markup (it references localhost:4001 / @react-refresh).\n` +
        '     Deploying this working tree ships an editor that cannot load its assets.\n' +
        '     Re-run a production `tinacms build` so the SPA is emitted, or deploy a clean clone.'
    );
  }
}

// --- report -----------------------------------------------------------------
for (const note of notes) console.warn(`⚠  ${note}`);

if (errors.length > 0) {
  console.error('\n✖ Build artifact verification failed:\n');
  for (const error of errors) console.error(`   • ${error}`);
  console.error('');
  if (strict) process.exit(1);
  process.exit(0);
}

console.log('✔ Build artifacts look deployable (cloud client, production admin).');
