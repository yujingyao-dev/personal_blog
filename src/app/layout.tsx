import type { Metadata } from 'next';
import Link from 'next/link';
import { metadataBaseUrl } from '@/lib/site-url';
import './globals.css';

const SITE_NAME = '我的博客';
const SITE_DESCRIPTION = '一个用 TinaCMS + Next.js 构建的静态个人博客';

export const metadata: Metadata = {
  // metadataBase is what turns the relative canonical/Open Graph URLs into absolute ones.
  // Without it Next emits href="/posts/x", which crawlers and social platforms cannot use —
  // a shared link then has no usable URL or image.
  metadataBase: metadataBaseUrl(),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

function SiteHeader() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          我的博客
        </Link>
        <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
          <Link href="/posts" className="hover:underline">
            文章
          </Link>
          <Link href="/about" className="hover:underline">
            关于
          </Link>
        </div>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-500">
        © {new Date().getFullYear()} 我的博客 · Built with Next.js &amp; TinaCMS
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
