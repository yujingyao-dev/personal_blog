import type { PostQuery, PostQueryVariables } from '@/tina/__generated__/types';
import { client } from '@/tina/__generated__/client';

/**
 * Query shape used to hydrate the visual editor (via `useTina`) and to prefetch
 * content during `next build`.
 */
export const postQuery = client.queries.post;

export type { PostQuery, PostQueryVariables };

export { client };
