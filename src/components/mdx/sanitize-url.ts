/**
 * Allowed URL schemes for links authored in rich text.
 *
 * The built-in TinaMarkdown anchor renderer sanitizes URLs; a custom `a` override replaces
 * that behaviour, so the same allowlist is applied here to keep schemes like `data:` out
 * of the DOM.
 */
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export function sanitizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Relative links, anchors and protocol-relative URLs are fine.
  if (/^[/#?]/.test(trimmed) || trimmed.startsWith('//')) return trimmed;

  try {
    const parsed = new URL(trimmed, 'https://example.invalid');
    return SAFE_SCHEMES.includes(parsed.protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
