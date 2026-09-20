import { resolveLocale, translateExceptionMessage } from './exception-messages';

describe('resolveLocale', () => {
  it('精确值、Accept-Language 串和语言前缀都能命中', () => {
    expect(resolveLocale('en-US')).toBe('en-US');
    expect(resolveLocale('en-GB,en;q=0.9,zh-CN;q=0.8')).toBe('en-US');
    expect(resolveLocale('zh-TW,zh;q=0.9')).toBe('zh-CN');
  });

  it('不支持或缺失时回默认语言', () => {
    expect(resolveLocale('fr-FR')).toBe('zh-CN');
    expect(resolveLocale(undefined)).toBe('zh-CN');
  });
});

describe('translateExceptionMessage', () => {
  it('有译文的消息按语言返回,默认语言原样', () => {
    expect(translateExceptionMessage('用户名或密码错误', 'en-US')).toBe(
      'Invalid username or password',
    );
    expect(translateExceptionMessage('用户名或密码错误', 'zh-CN')).toBe(
      '用户名或密码错误',
    );
  });

  it('没有译文的消息原样返回', () => {
    expect(translateExceptionMessage('name must be a string', 'en-US')).toBe(
      'name must be a string',
    );
  });
});
