'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  interpolate,
  writeLocaleCookie,
  type Locale,
} from '@/lib/i18n-core';
import enUS from '@/lib/messages/en-US';
import zhCN from '@/lib/messages/zh-CN';

export type { Locale } from '@/lib/i18n-core';
export { LOCALES } from '@/lib/i18n-core';

export type MessageKey = keyof typeof zhCN;
type MessageValues = Record<string, string | number>;
export type Translate = (key: MessageKey, values?: MessageValues) => string;

const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translate: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// 给 hook 之外的代码用(如 api-client);组件内一律走 useI18n().translate
export function translateWithLocale(
  locale: Locale,
  key: MessageKey,
  values?: MessageValues,
): string {
  return interpolate(MESSAGES[locale][key] ?? zhCN[key] ?? key, values);
}

// 语言只存 cookie:服务端布局据此渲染 <html lang> 和首屏,客户端切换后写回 cookie,
// 前后端首屏一致,不会有水合错位。initialLocale 由 RootLayout 从 cookie / Accept-Language 解析。
export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        writeLocaleCookie(nextLocale);
        document.documentElement.lang = nextLocale;
        setLocaleState(nextLocale);
      },
      translate(key, values) {
        return translateWithLocale(locale, key, values);
      },
    }),
    [locale],
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const contextValue = useContext(I18nContext);
  if (!contextValue) {
    throw new Error('useI18n 必须在 I18nProvider 内使用');
  }
  return contextValue;
}
