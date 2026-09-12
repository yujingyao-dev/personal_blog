/**
 * URL sanitization for the custom anchor renderer.
 *
 * Overriding `a` in the `components` map replaces TinaMarkdown's built-in sanitization, so this
 * has to reproduce it. It delegates to Tina's own sanitizer
 * (`@tinacms/mdx/sanitize-url`, the module `tinacms`'s rich-text renderer itself uses) rather
 * than keeping a second scheme allowlist that could drift from the official one.
 *
 * The built-in list is `http`, `https`, `mailto`, `tel`, `xref`. Note `xref`, which is a CMS
 * cross-reference scheme — a hand-written allowlist without it silently turns valid internal
 * references into plain text, which is exactly the kind of drift this avoids.
 */
import { sanitizeUrl as tinaSanitizeUrl } from '@tinacms/mdx/sanitize-url';

/**
 * Returns a safe href, or undefined when the URL must not become a link (for example a
 * `javascript:` payload, which Tina's sanitizer rejects).
 *
 * Tina's sanitizer returns an empty string for disallowed schemes; the caller renders plain
 * text in that case instead of emitting `<a href="">`.
 */
export function sanitizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  const sanitized = tinaSanitizeUrl(trimmed);
  return sanitized ? sanitized : undefined;
}
