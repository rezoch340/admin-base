declare global {
  interface Window {
    __ADMIN_BASE_CONFIG__?: {
      apiUrl?: string;
      apiPort?: number;
    };
  }
}

import { DEFAULT_LOCALE, readLocaleCookie, type Locale } from '@/lib/i18n-core';
import { translateWithLocale } from '@/lib/i18n';

const TOKEN_STORAGE_KEY = 'admin_base_auth_token';

function resolveApiBaseUrl(): string {
  const runtimeConfiguration =
    typeof window === 'undefined' ? undefined : window.__ADMIN_BASE_CONFIG__;
  if (runtimeConfiguration?.apiUrl) {
    return runtimeConfiguration.apiUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const apiPort = runtimeConfiguration?.apiPort ?? 3100;
    return `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
  }

  return 'http://127.0.0.1:3100';
}

export const tokenStorage = {
  read(): string | null {
    return typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  write(token: string): void {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clear(): void {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

function extractErrorMessage(
  responseBody: unknown,
  fallback: string,
  locale: Locale,
): string {
  if (!responseBody || typeof responseBody !== 'object') {
    return fallback;
  }
  const message = (responseBody as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.map(String).join(locale === 'zh-CN' ? '；' : '; ');
  }
  return typeof message === 'string' ? message : fallback;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function getRequestErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

export async function requestApi<ResponseBody>(
  path: string,
  requestOptions: RequestInit = {},
): Promise<ResponseBody> {
  const authenticationToken = tokenStorage.read();
  // 后端按这个头翻译异常消息;没有 cookie 时与服务端首屏一样落到默认语言
  const locale = readLocaleCookie() ?? DEFAULT_LOCALE;
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...requestOptions,
    headers: {
      'content-type': 'application/json',
      'accept-language': locale,
      ...(authenticationToken
        ? { Authorization: `Bearer ${authenticationToken}` }
        : {}),
      ...requestOptions.headers,
    },
  });

  if (response.status === 401 && authenticationToken) {
    tokenStorage.clear();
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  }

  if (!response.ok) {
    const responseBody: unknown = await response.json().catch(() => undefined);
    throw new ApiRequestError(
      response.status,
      extractErrorMessage(
        responseBody,
        response.statusText || translateWithLocale(locale, 'common.requestFailed'),
        locale,
      ),
    );
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined as ResponseBody;
  }
  return JSON.parse(responseText) as ResponseBody;
}

export function buildQueryString(
  values: Record<string, string | number | undefined>,
): string {
  const searchParameters = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      searchParameters.set(key, String(value));
    }
  }
  const queryString = searchParameters.toString();
  return queryString ? `?${queryString}` : '';
}
