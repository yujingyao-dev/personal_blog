import { client as generatedClient } from '@/tina/__generated__/client';

/**
 * The data client used by the whole site.
 *
 * Two deliberate deviations from the generated defaults:
 *
 * 1. `cacheEnabled = false`. `tinacms build --content=local` generates a client with a
 *    `cacheDir`, and the Tina client then serves responses from that on-disk cache WITHOUT a
 *    TTL. On a long-lived `next start` process or a warm serverless instance the first
 *    response would be reused for the lifetime of the process, so `revalidate = 60` could
 *    not make edited content appear: revalidation re-runs the fetch, but the fetch is
 *    answered from disk.
 *
 * 2. `errorPolicy = 'include'`. The default is 'throw', which rejects on ANY GraphQL error —
 *    including the "Unable to find record" error a missing document produces. That makes it
 *    impossible to tell "no such post" from "the request failed", so `notFound()` is never
 *    reached and every unknown URL returns 500. With 'include', a missing record resolves to
 *    `data.post === null` (handled with notFound()) while transport failures still reject.
 *    Trade-off: a schema-level error surfaces as an empty result rather than a crash, which
 *    is why the pages treat "no data" explicitly instead of assuming a value is present.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const configuration = generatedClient as any;
configuration.cache = null;
configuration.cacheEnabled = false;
configuration.errorPolicy = 'include';

export const client = generatedClient;

/** Re-exported for call sites that want the post query directly. */
export const postQuery = client.queries.post;
