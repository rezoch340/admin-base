import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { readRuntimeConfiguration } from '@/lib/runtime-config';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin Base 控制台',
  description: '通用后台管理、账号权限与系统审计',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const runtimeConfiguration = JSON.stringify(
    readRuntimeConfiguration(),
  ).replace(/</g, '\\u003c');
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ADMIN_BASE_CONFIG__=${runtimeConfiguration};`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
