'use client';

import Image from 'next/image';
import { ZoomableImage } from '@/components/mdx/zoomable-image';
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
 *
 * Styling: a frosted plate inside a hard outline (the image keeps a softer inner radius so the
 * frame reads as a mounted print), with the caption as a Neo-Brutalist "sticker" pill.
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

  const imageClass = 'h-auto w-full rounded-xl';

  const image =
    isRemote && optimizerAllowed ? (
      <Image
        src={src}
        alt={altText}
        width={dimensions.width}
        height={dimensions.height}
        priority={Boolean(priority)}
        sizes="(max-width: 768px) 100vw, 768px"
        className={`relative ${imageClass}`}
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={altText}
        width={dimensions.width}
        height={dimensions.height}
        loading={priority ? 'eager' : 'lazy'}
        className={`relative ${imageClass}`}
      />
    );

  return (
    <figure className="not-prose my-10">
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-ink/85 bg-white/55 p-2 shadow-brutal-lg backdrop-blur-xl dark:border-chalk/20 dark:bg-white/[0.04] dark:shadow-chalk-lg">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_50%_50%,#6d5cff,transparent_70%)] opacity-30 blur-2xl"
        />
        <ZoomableImage src={src} alt={altText} caption={caption}>
          {image}
        </ZoomableImage>
      </div>

      {caption ? (
        <figcaption className="mx-auto mt-3.5 w-fit max-w-full rounded-full border-2 border-ink/85 bg-white/80 px-4 py-1 text-center text-sm font-bold text-ink/70 shadow-brutal-xs backdrop-blur dark:border-chalk/25 dark:bg-white/[0.06] dark:text-slate-300 dark:shadow-chalk-xs">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
