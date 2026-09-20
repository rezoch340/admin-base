// 纯函数部分,不依赖 React,方便 node --test 直接跑
export const LOCALES = ['zh-CN', 'en-US'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'zh-CN';
export const LOCALE_COOKIE_NAME = 'admin_base_locale';

// 同时接受精确值(cookie 里存的)和 Accept-Language 串("en-US,en;q=0.9"),按语言前缀匹配
export function resolveLocale(candidate: string | null | undefined): Locale {
  if (!candidate) {
    return DEFAULT_LOCALE;
  }
  for (const languageTag of candidate.split(',')) {
    const language = languageTag.split(';')[0].trim().toLowerCase();
    const matchedLocale = LOCALES.find(
      (locale) =>
        locale.toLowerCase() === language ||
        locale.toLowerCase().startsWith(`${language}-`),
    );
    if (matchedLocale) {
      return matchedLocale;
    }
  }
  return DEFAULT_LOCALE;
}

// "{name}" 占位符替换;没给值的占位符原样保留
export function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const cookieEntry = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`));
  return cookieEntry ? resolveLocale(cookieEntry.split('=')[1]) : null;
}

export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
