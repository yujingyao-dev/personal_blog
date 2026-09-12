/**
 * Preflight check for the offline/local build path (`npm run build:local`).
 *
 * `tinacms build --local` generates a client pointed at the local content API, and
 * `next build` then reads content from it during static generation. If that server is not
 * running, the build fails deep inside page-data collection with a cryptic
 * "fetch failed / ECONNREFUSED". This checks first and explains what to do.
 */
const url = process.env.TINA_LOCAL_URL ?? 'http://localhost:4001/graphql';

const body = JSON.stringify({ query: '{ postConnection { totalCount } }' });

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    console.error(`✖ Local Tina content API at ${url} responded with HTTP ${response.status}.`);
    process.exit(1);
  }

  const json = await response.json();
  const total = json?.data?.postConnection?.totalCount;
  console.log(`✔ Local Tina content API reachable at ${url} (posts: ${total ?? 'unknown'}).`);
} catch (error) {
  console.error(`✖ Local Tina content API is not reachable at ${url}.`);
  console.error(`   ${error?.message ?? error}`);
  console.error(
    '\nThe offline build reads content through the local API. Start it first in another terminal:\n' +
      '   npx tinacms dev --noWatch\n' +
      '   (add -c "next dev" to also serve the site — that is what `npm run dev` does)\n' +
      'then re-run: npm run build:local\n' +
      '\nNote: `tinacms dev --no-server` does NOT start the API — it only regenerates the client.\n'
  );
  console.error('For a real production build (with TinaCloud credentials) use: npm run build');
  process.exit(1);
}
