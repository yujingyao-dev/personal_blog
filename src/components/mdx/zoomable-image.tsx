'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Click-to-zoom wrapper for images in article bodies.
 *
 * Wraps whatever image element the caller renders (`next/image` for allowlisted
 * remote hosts, a plain `<img>` otherwise) so both paths get the same behaviour —
 * the wrapper takes `children` rather than rendering the image itself precisely
 * to avoid duplicating the optimizer-allowlist logic that lives in `Figure`.
 *
 * The overlay re-requests the ORIGINAL `src`, not the optimizer URL: the point of
 * a lightbox is the full-resolution image, and for remote hosts the original is
 * what the optimizer was resizing down in the first place.
 *
 * ── Why the overlay is rendered through a portal ────────────────────────────
 * `position: fixed` is only relative to the viewport while no ancestor establishes
 * a containing block for it. Two ancestors here do:
 *
 *   - `Figure`'s frame uses `backdrop-blur-*`, and `backdrop-filter` creates one;
 *   - anything carrying `animate-rise` keeps a transform, and a transform creates
 *     one too.
 *
 * Rendered in place, the overlay was therefore trapped inside the image frame —
 * a dialog measured at 730x418 sitting in the middle of a 1280x900 viewport
 * instead of covering it. Portalling to `document.body` sidesteps every present
 * and future containing block rather than requiring each wrapper to stay trap-free.
 *
 * Motion comes from the CSS `animate-pop` utility rather than Framer Motion, so
 * the two standing gates already cover it for free: the global
 * `prefers-reduced-motion` rule and the mobile no-motion rule both switch CSS
 * animations off, and the overlay then simply appears.
 */
export function ZoomableImage({
  src,
  alt,
  children,
  /** Rendered under the image inside the overlay (Figure's caption). */
  caption,
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
  caption?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      // `aria-modal="true"` promises the rest of the page is inert, so Tab must
      // not walk out of the dialog into the content behind it.
      if (event.key !== 'Tab') return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // Stop the page behind the overlay from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus in, or a keyboard user is left on a trigger they can no longer see.
    closeButton.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Return focus where it came from, or keyboard users lose their place.
      trigger.current?.focus();
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `放大图片：${alt}` : '放大图片'}
        className="block w-full cursor-zoom-in rounded-xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-iris"
      >
        {children}
      </button>

      {open
        ? createPortal(
            <div
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-label={alt || '图片预览'}
              onClick={close}
              className="fixed inset-0 z-[60] grid animate-pop cursor-zoom-out place-items-center bg-ink/85 p-4 backdrop-blur-md print:hidden sm:p-8"
            >
              <figure className="flex max-h-full max-w-full flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  // Clicking the image itself should not dismiss the overlay.
                  onClick={(event) => event.stopPropagation()}
                  className="max-h-[80vh] w-auto max-w-full cursor-default rounded-2xl border-[3px] border-chalk/25 object-contain"
                />
                {caption ? (
                  <figcaption
                    onClick={(event) => event.stopPropagation()}
                    className="max-w-2xl rounded-full border-2 border-chalk/25 bg-ink/70 px-4 py-1 text-center text-sm font-bold text-chalk backdrop-blur"
                  >
                    {caption}
                  </figcaption>
                ) : null}
              </figure>

              <button
                ref={closeButton}
                type="button"
                onClick={close}
                aria-label="关闭图片预览"
                className="absolute top-4 right-4 grid h-11 w-11 place-items-center rounded-full border-2 border-chalk/40 bg-ink/70 text-lg font-black text-chalk backdrop-blur transition-colors hover:bg-ink"
              >
                ✕
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
