'use client';

import Image from 'next/image';

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

function isRemote(src: string) {
  return /^https?:\/\//.test(src);
}

/**
 * A captioned image embed.
 *
 * Local media lives in `public/uploads` and is served by Next directly; remote URLs (for
 * example TinaCloud assets on `assets.tina.io`) go through `next/image`, which requires the
 * host in `next.config.ts` `images.remotePatterns`.
 */
export function Figure({ src, alt, caption, width, height, priority }: FigureProps) {
  if (!src) return null;

  const dimensions =
    typeof width === 'number' && typeof height === 'number'
      ? { width, height }
      : { width: 1200, height: 675 };

  return (
    <figure className="not-prose my-8">
      {isRemote(src) ? (
        <Image
          src={src}
          alt={alt ?? caption ?? ''}
          width={dimensions.width}
          height={dimensions.height}
          priority={Boolean(priority)}
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full rounded-lg"
        />
      ) : (
        // Local files in public/ do not need the optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? caption ?? ''}
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
