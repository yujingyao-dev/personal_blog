import { client as generatedClient } from '@/tina/__generated__/client';

/**
 * The data client used by the whole site.
 *
 * Why this wrapper exists: `tinacms build --content=local` generates a client with a
 * `cacheDir`, and the Tina client then serves `postConnection`/`post` responses from that
 * on-disk cache **without any TTL**. On a long-lived `next start` process or a warm
 * serverless instance the first response would be reused for the lifetime of the process,
 * so `export const revalidate = 60` could not make edited content appear: revalidation
 * re-runs the fetch, but the fetch is answered from disk.
 *
 * The client exposes `cache` and `cacheEnabled` publicly, and the `cache` option in
 * `TinaClientArgs` is the documented escape hatch for runtimes where the cache should not
 * run. Pinning it off here — in a file that is NOT overwritten by `tinacms build` — makes
 * content freshness depend on the network again.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noCacheClient = generatedClient as any;
noCacheClient.cache = null;
noCacheClient.cacheEnabled = false;

export const client = generatedClient;

/** Re-exported for call sites that want the post query directly. */
export const postQuery = client.queries.post;
