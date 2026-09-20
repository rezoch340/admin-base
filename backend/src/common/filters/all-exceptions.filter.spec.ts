import {
  BadRequestException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { flattenExceptionMessage } from './all-exceptions.filter';

describe('flattenExceptionMessage', () => {
  it('把 Nest 的结构化响应摊平成字符串并按语言翻译', () => {
    const exception = new NotFoundException('用户不存在');
    expect(flattenExceptionMessage(exception, 'zh-CN')).toBe('用户不存在');
    expect(flattenExceptionMessage(exception, 'en-US')).toBe('User not found');
  });

  it('class-validator 的数组消息保持数组', () => {
    const exception = new BadRequestException([
      'name must be a string',
      'password must be longer than or equal to 6 characters',
    ]);
    expect(flattenExceptionMessage(exception, 'en-US')).toEqual([
      'name must be a string',
      'password must be longer than or equal to 6 characters',
    ]);
  });

  it('没有 message 字段的自定义响应体退回 exception.message', () => {
    const exception = new HttpException({ code: 'CUSTOM' }, 418);
    expect(flattenExceptionMessage(exception, 'zh-CN')).toBe('Http Exception');
  });

  it('非 HttpException 统一为 Internal server error', () => {
    expect(flattenExceptionMessage(new Error('boom'), 'en-US')).toBe(
      'Internal server error',
    );
  });
});
