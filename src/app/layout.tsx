import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '我的博客',
    template: '%s | 我的博客',
  },
  description: '一个用 TinaCMS + Next.js 构建的静态个人博客',
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
    },
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
