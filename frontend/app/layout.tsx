import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { Providers } from '@/components/providers';
import { LOCALE_COOKIE_NAME, resolveLocale, type Locale } from '@/lib/i18n-core';
import zhCN from '@/lib/messages/zh-CN';
import enUS from '@/lib/messages/en-US';
import { readRuntimeConfiguration } from '@/lib/runtime-config';
import './globals.css';

export const dynamic = 'force-dynamic';

// 首选用户切过的 cookie,没有则按浏览器 Accept-Language
async function requestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return resolveLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value ??
      headerStore.get('accept-language'),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const messages = (await requestLocale()) === 'en-US' ? enUS : zhCN;
  return {
    title: messages['app.title'],
    description: messages['app.description'],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await requestLocale();
  const runtimeConfiguration = JSON.stringify(
    readRuntimeConfiguration(),
  ).replace(/</g, '\\u003c');
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ADMIN_BASE_CONFIG__=${runtimeConfiguration};`,
          }}
        />
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
