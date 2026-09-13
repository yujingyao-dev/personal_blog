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
    <figure className="not-prose my-10">
      {/* Frosted plate + hard outline + hard offset shadow: the same frame as <Figure>. */}
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-ink/85 bg-white/55 p-2 shadow-brutal-lg backdrop-blur-xl dark:border-chalk/20 dark:bg-white/[0.04] dark:shadow-chalk-lg">
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_50%_50%,#ff6b9d,transparent_70%)] opacity-30 blur-2xl"
        />
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-ink/5 dark:bg-white/5">
          <iframe
            src={embedUrl}
            title={title ?? caption ?? '嵌入式视频'}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
      {caption ? (
        <figcaption className="mx-auto mt-3.5 w-fit max-w-full rounded-full border-2 border-ink/85 bg-white/80 px-4 py-1 text-center text-sm font-bold text-ink/70 shadow-brutal-xs backdrop-blur dark:border-chalk/25 dark:bg-white/[0.06] dark:text-slate-300 dark:shadow-chalk-xs">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
