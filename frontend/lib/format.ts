export function formatDateTime(
  value: string | null | undefined,
  locale = 'zh-CN',
): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatNumber(
  value: number | null | undefined,
  locale = 'zh-CN',
): string {
  return new Intl.NumberFormat(locale).format(value ?? 0);
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
