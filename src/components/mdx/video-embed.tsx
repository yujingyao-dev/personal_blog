'use client';

export type VideoProvider = 'youtube' | 'bilibili';

export interface VideoEmbedProps {
  provider?: string | null;
  /** Video id, or a full URL — both are accepted and normalised. */
  videoId?: string | null;
  title?: string | null;
  caption?: string | null;
}

const ALLOWED_PROVIDERS: VideoProvider[] = ['youtube', 'bilibili'];

function normalizeProvider(value?: string | null): VideoProvider {
  return value && ALLOWED_PROVIDERS.includes(value as VideoProvider)
    ? (value as VideoProvider)
    : 'youtube';
}

/** Accept a bare id or any of the usual URL shapes and return the embed src. */
export function toEmbedUrl(provider: VideoProvider, input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  if (provider === 'youtube') {
    // youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/embed/<id>
    const fromUrl = /(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/.exec(value);
    const id = fromUrl ? fromUrl[1] : /^[A-Za-z0-9_-]{6,}$/.test(value) ? value : null;
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  // bilibili: BV<id> or an av<id>
  const fromUrl = /(BV[A-Za-z0-9]{8,}|av\d+)/.exec(value);
  const id = fromUrl ? fromUrl[1] : /^(BV[A-Za-z0-9]{8,}|av\d+)$/.test(value) ? value : null;
  if (!id) return null;
  const query = id.startsWith('BV') ? `bvid=${id}` : `aid=${id.slice(2)}`;
  return `https://player.bilibili.com/player.html?${query}&high_quality=1&danmaku=0`;
}

/**
 * A responsive video embed.
 *
 * Only a whitelist of providers is rendered — the src is built from a validated video id, so
 * a hand-written MDX value cannot inject an arbitrary iframe URL.
 */
export function VideoEmbed({ provider, videoId, title, caption }: VideoEmbedProps) {
  const resolvedProvider = normalizeProvider(provider);
  const embedUrl = videoId ? toEmbedUrl(resolvedProvider, videoId) : null;

  if (!embedUrl) return null;

  return (
    <figure className="not-prose my-8">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        <iframe
          src={embedUrl}
          title={title ?? caption ?? '嵌入式视频'}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
