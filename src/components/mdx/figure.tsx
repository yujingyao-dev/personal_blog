'use client';

import Image from 'next/image';
import { isUrlAllowedForOptimizer } from '@/lib/image-hosts';

export interface FigureProps {
  /** `image` field in the schema: an absolute path or a remote URL. */
  src?: string | null;
  alt?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  /** Mark as priority when it appears above the fold. */
  priority?: boolean | null;
}

/**
 * A captioned image embed.
 *
 * A remote image outside `images.remotePatterns` cannot go through the optimizer — it answers
 * `400 "url" parameter is not allowed`, so the page renders 200 while the image is silently
 * broken. The URL comes from the editor, so this is easy to hit. Such images are served as-is
 * with a plain <img> (the browser fetches the original) and a development warning names the host.
 *
 * The decision is made synchronously during render, from the same allowlist that generates
 * `remotePatterns` in next.config.ts. That keeps the server and client markup identical (no
 * hydration mismatch) and avoids emitting an optimizer URL the optimizer would reject.
 *
 * The caption renders in both paths on purpose: if the fallback <img> is broken too, the mistake
 * stays visible instead of leaving an empty gap.
 */
export function Figure({ src, alt, caption, width, height, priority }: FigureProps) {
  if (!src) return null;

  const dimensions =
    typeof width === 'number' && typeof height === 'number'
      ? { width, height }
      : { width: 1200, height: 675 };

  const altText = alt ?? caption ?? '';

  // Local files in public/ never need the optimizer.
  const isRemote = /^https?:\/\//.test(src);
  let optimizerAllowed = false;
  if (isRemote) {
    try {
      optimizerAllowed = isUrlAllowedForOptimizer(new URL(src));
    } catch {
      optimizerAllowed = false;
    }
    if (!optimizerAllowed && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[Figure] Remote image host is not matched by images.remotePatterns, so the Next.js ` +
          `image optimizer would reject it. Rendering the original URL instead. Add the host to ` +
          `ALLOWED_IMAGE_HOSTS in src/lib/image-hosts.ts to enable optimization. src="${src}"`
      );
    }
  }

  return (
    <figure className="not-prose my-8">
      {isRemote && optimizerAllowed ? (
        <Image
          src={src}
          alt={altText}
          width={dimensions.width}
          height={dimensions.height}
          priority={Boolean(priority)}
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full rounded-lg"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={altText}
          width={dimensions.width}
          height={dimensions.height}
          loading={priority ? 'eager' : 'lazy'}
          className="h-auto w-full rounded-lg"
        />
      )}
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
