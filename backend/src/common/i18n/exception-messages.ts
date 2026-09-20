// 异常消息按 Accept-Language 翻译。业务代码继续用中文原文 throw(gettext 风格:源文即键),
// 这里只维护译文;没有译文的消息(如 class-validator 的英文校验)原样返回。
// 审计日志里存的仍是中文原文,不随请求语言变。
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'zh-CN';

const TRANSLATIONS: Record<string, Partial<Record<Locale, string>>> = {
  '请求参数不得包含 NUL 字节': {
    'en-US': 'Request parameters must not contain NUL bytes',
  },
  编号超出取值范围: { 'en-US': 'ID is out of range' },
  未声明权限要求: { 'en-US': 'No permission requirement declared' },
  权限组已存在: { 'en-US': 'Permission group already exists' },
  权限组不存在: { 'en-US': 'Permission group not found' },
  权限已存在: { 'en-US': 'Permission already exists' },
  权限不存在: { 'en-US': 'Permission not found' },
  权限组已拥有该权限: {
    'en-US': 'Permission group already has this permission',
  },
  权限组未拥有该权限: {
    'en-US': 'Permission group does not have this permission',
  },
  用户已拥有该权限组: { 'en-US': 'User already has this permission group' },
  用户未拥有该权限组: { 'en-US': 'User does not have this permission group' },
  用户不存在: { 'en-US': 'User not found' },
  '至少提供 name 或 description': {
    'en-US': 'Provide at least one of name or description',
  },
  仅种子管理员可执行此操作: {
    'en-US': 'Only the seed administrator can perform this operation',
  },
  用户名或密码错误: { 'en-US': 'Invalid username or password' },
  账号已禁用: { 'en-US': 'Account is disabled' },
  凭证无效: { 'en-US': 'Invalid credentials' },
  账号不存在或已删除: { 'en-US': 'Account does not exist or was deleted' },
  用户名已存在: { 'en-US': 'Username already exists' },
  管理员账号只能由本人修改: {
    'en-US': 'An administrator account can only be modified by its owner',
  },
  'Internal server error': { 'en-US': 'Internal server error' },
};

// 接受精确值和 Accept-Language 串("en-US,en;q=0.9"),按语言前缀匹配,都不匹配回默认语言
export function resolveLocale(acceptLanguage: string | undefined): Locale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }
  for (const languageTag of acceptLanguage.split(',')) {
    const language = languageTag.split(';')[0].trim().toLowerCase();
    const matchedLocale = SUPPORTED_LOCALES.find(
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

export function translateExceptionMessage(
  message: string,
  locale: Locale,
): string {
  if (locale === DEFAULT_LOCALE) {
    return message;
  }
  return TRANSLATIONS[message]?.[locale] ?? message;
}
