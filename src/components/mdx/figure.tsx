'use client';

import Image from 'next/image';
import { isAllowedImageHost } from '@/lib/image-hosts';

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
 * Remote images that are not covered by `images.remotePatterns` cannot go through the
 * optimizer — it answers `400 "url" parameter is not allowed`, so the page renders fine while
 * the image is silently broken. Since the URL comes from the editor, that is easy to hit: any
 * remote host other than the configured ones. Such images fall back to a plain <img> (the
 * browser fetches the original), and a warning is logged in development telling the author to
 * add the host to `ALLOWED_IMAGE_HOSTS` in `next.config.ts`.
 *
 * The caption is rendered in both paths on purpose: if the fallback `<img>` is broken too, the
 * caption makes the mistake visible instead of leaving an empty gap.
 */
export function Figure({ src, alt, caption, width, height, priority }: FigureProps) {
  if (!src) return null;

  const dimensions =
    typeof width === 'number' && typeof height === 'number'
      ? { width, height }
      : { width: 1200, height: 675 };

  const altText = alt ?? caption ?? '';
  const isRemote = /^https?:\/\//.test(src);

  let hostname: string | null = null;
  if (isRemote) {
    try {
      hostname = new URL(src).hostname;
    } catch {
      hostname = null;
    }
  }

  const optimizerAllowed = hostname !== null && isAllowedImageHost(hostname);

  if (isRemote && !optimizerAllowed && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[Figure] Remote image host "${hostname}" is not in ALLOWED_IMAGE_HOSTS ` +
        `(next.config.ts). Rendering it without the Next.js image optimizer. ` +
        `Add the host there to enable optimization.`
    );
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
        // Local files in public/ and non-allowlisted remote URLs are served as-is.
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
