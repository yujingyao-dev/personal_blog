<?xml version="1.0" encoding="UTF-8"?>
<!--
  Stylesheet for /rss.xml.

  A raw RSS feed is technically fine for feed readers but renders as an unreadable
  wall of XML when a human opens it in a browser — which is exactly what happens
  when someone clicks the feed link to see what it is. This turns it into a real
  page using the same visual language as the site (thick outlines, hard offset
  shadows, the four accent colours).

  Constraints that shaped it:
    - It is an XSLT document, not part of the React app, so Tailwind is not
      available and the CSS has to be inline here.
    - The browser's XSLT processor replaces the whole document, so `@media
      (prefers-color-scheme: dark)` is honoured directly rather than through the
      site's `data-theme` attribute (which no longer exists at that point).
    - Feed readers ignore `<?xml-stylesheet?>` entirely, so this cannot break
      subscriptions. If XSLT is unsupported the raw XML is shown, as before.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  exclude-result-prefixes="atom">

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title><xsl:value-of select="rss/channel/title" /> · RSS</title>
        <style>
          :root {
            --ink: #0b1221;
            --paper: #f7f4ee;
            --iris: #6d5cff;
            --blush: #ff6b9d;
            --sun: #ffd166;
            --mint: #4ade9b;
            --iris-text: #4f3ce0;
            --muted: rgba(11, 18, 33, 0.72);
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --ink: #e9eef8;
              --paper: #060a12;
              --iris-text: #a5b4fc;
              --muted: rgba(233, 238, 248, 0.74);
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 2.5rem 1.25rem 4rem;
            background-color: var(--paper);
            /* The same stacked colour fields as the site backdrop, static here. */
            background-image:
              radial-gradient(60rem 40rem at 12% -10%, rgba(109, 92, 255, 0.28), transparent 65%),
              radial-gradient(48rem 34rem at 92% 8%, rgba(255, 107, 157, 0.24), transparent 65%),
              radial-gradient(52rem 40rem at 78% 105%, rgba(74, 222, 155, 0.22), transparent 65%);
            background-attachment: fixed;
            color: var(--ink);
            font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
              'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            line-height: 1.7;
            -webkit-font-smoothing: antialiased;
          }
          .wrap { max-width: 46rem; margin: 0 auto; }
          .card {
            border: 3px solid var(--ink);
            border-radius: 1.5rem;
            background: rgba(255, 255, 255, 0.62);
            backdrop-filter: blur(16px) saturate(1.4);
            box-shadow: 8px 8px 0 0 var(--ink);
            padding: 1.75rem 1.75rem 1.25rem;
          }
          @media (prefers-color-scheme: dark) {
            .card { background: rgba(255, 255, 255, 0.05); }
          }
          .bar {
            display: block; width: 6rem; height: 0.5rem; border-radius: 999px;
            background: linear-gradient(90deg, var(--iris), var(--blush), var(--sun));
            margin-bottom: 1.25rem;
          }
          h1 { margin: 0 0 0.5rem; font-size: 1.9rem; font-weight: 900; letter-spacing: -0.01em; }
          .desc { margin: 0 0 1.5rem; color: var(--muted); }
          .meta { margin: 0 0 1.25rem; font-size: 0.85rem; color: var(--muted); }
          .meta a { color: var(--iris-text); }
          ol { list-style: none; margin: 0; padding: 0; }
          li {
            border-top: 2px solid color-mix(in oklab, var(--ink) 18%, transparent);
            padding: 1.1rem 0;
          }
          li:first-child { border-top: 0; }
          .item-title { font-size: 1.15rem; font-weight: 800; margin: 0 0 0.35rem; }
          .item-title a { color: inherit; text-decoration: none; }
          .item-title a:hover { text-decoration: underline; text-decoration-color: var(--iris); text-decoration-thickness: 2px; text-underline-offset: 4px; }
          .date { font-size: 0.75rem; font-weight: 700; color: var(--muted); }
          .item-desc { margin: 0.5rem 0 0; color: var(--muted); }
          footer { margin-top: 1.5rem; font-size: 0.8rem; color: var(--muted); }
          footer a { color: var(--iris-text); }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <span class="bar"></span>
            <h1><xsl:value-of select="rss/channel/title" /></h1>
            <p class="desc"><xsl:value-of select="rss/channel/description" /></p>
            <p class="meta">
              <a href="{rss/channel/link}"><xsl:value-of select="rss/channel/link" /></a>
              <xsl:text> · </xsl:text>
              <xsl:value-of select="count(rss/channel/item)" />
              <xsl:text> 篇</xsl:text>
            </p>

            <ol>
              <xsl:for-each select="rss/channel/item">
                <li>
                  <p class="item-title">
                    <a href="{link}"><xsl:value-of select="title" /></a>
                  </p>
                  <xsl:if test="pubDate">
                    <span class="date"><xsl:value-of select="pubDate" /></span>
                  </xsl:if>
                  <xsl:if test="description">
                    <p class="item-desc"><xsl:value-of select="description" /></p>
                  </xsl:if>
                </li>
              </xsl:for-each>
            </ol>

            <footer>
              <xsl:text>这是一个 RSS 订阅源。把它加进阅读器：</xsl:text>
              <a href="{rss/channel/atom:link/@href}">rss.xml</a>
            </footer>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
