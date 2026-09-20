import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpolate, resolveLocale } from '../lib/i18n-core.ts';

test('resolveLocale 接受精确值、Accept-Language 串和前缀', () => {
  assert.equal(resolveLocale('en-US'), 'en-US');
  assert.equal(resolveLocale('en-GB,en;q=0.9,zh-CN;q=0.8'), 'en-US');
  assert.equal(resolveLocale('zh-TW,zh;q=0.9'), 'zh-CN');
  assert.equal(resolveLocale('fr-FR'), 'zh-CN');
  assert.equal(resolveLocale(undefined), 'zh-CN');
});

test('interpolate 替换占位符,缺值的原样保留', () => {
  assert.equal(
    interpolate('删除 {name} 后,{count} 个用户受影响', { name: 'ops', count: 3 }),
    '删除 ops 后,3 个用户受影响',
  );
  assert.equal(interpolate('第 {page} 页', {}), '第 {page} 页');
  assert.equal(interpolate('无占位符'), '无占位符');
});
