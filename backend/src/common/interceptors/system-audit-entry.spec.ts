import type { AuthedRequest } from '../types/authed-request';
import { buildSystemAuditEntry } from './system-audit-entry';

function createRequest(body: Record<string, unknown>): AuthedRequest {
  return {
    body,
    headers: {
      'user-agent': 'audit-test',
      'x-forwarded-for': '192.0.2.10, 10.0.0.1',
    },
    method: 'POST',
    originalUrl: '/users?ignored=true',
    params: {},
    query: {},
    socket: {},
    user: {
      id: 1,
      username: 'admin',
      permissions: [],
      isRoot: true,
    },
  };
}

describe('系统操作审计条目', () => {
  it('生成谁做了什么的人类可读摘要', () => {
    const systemLogEntry = buildSystemAuditEntry({
      definition: {
        name: '创建用户',
        action: 'create',
        subject: 'user',
        targetType: 'user',
        targetNameField: 'username',
        targetResponseField: 'id',
        metadataBodyFields: ['role'],
      },
      request: createRequest({
        username: 'alice',
        password: 'secret-password',
        role: 'operator',
      }),
      responseBody: { id: 20, username: 'alice' },
      status: 'succeeded',
      statusCode: 201,
    });

    expect(systemLogEntry.description).toBe(
      'admin 创建用户 alice (role="operator")',
    );
    expect(systemLogEntry.targetId).toBe('20');
    expect(systemLogEntry.route).toBe('/users');
    expect(systemLogEntry.ipAddress).toBe('192.0.2.10');
  });

  it('只保留装饰器白名单字段且不泄露密码', () => {
    const systemLogEntry = buildSystemAuditEntry({
      definition: {
        name: '修改用户密码',
        action: 'update-password',
        subject: 'user',
        targetType: 'user',
        targetParameter: 'id',
      },
      request: {
        ...createRequest({ password: 'must-not-appear' }),
        method: 'PATCH',
        originalUrl: '/users/20/password',
        params: { id: '20' },
      },
      status: 'succeeded',
      statusCode: 200,
    });

    expect(systemLogEntry.metadata).toEqual({});
    expect(JSON.stringify(systemLogEntry)).not.toContain('must-not-appear');
  });

  it('失败操作保留状态和错误但不改变结构', () => {
    const systemLogEntry = buildSystemAuditEntry({
      definition: {
        name: '删除用户',
        action: 'delete',
        subject: 'user',
        targetType: 'user',
        targetParameter: 'id',
      },
      request: {
        ...createRequest({}),
        method: 'DELETE',
        originalUrl: '/users/999',
        params: { id: '999' },
      },
      status: 'failed',
      statusCode: 404,
      errorMessage: '用户不存在',
    });

    expect(systemLogEntry.status).toBe('failed');
    expect(systemLogEntry.statusCode).toBe(404);
    expect(systemLogEntry.description).toBe('admin 删除用户 999 [失败]');
    expect(systemLogEntry.errorMessage).toBe('用户不存在');
  });

  it('无请求体的操作仍可记录响应中的目标名称', () => {
    const requestWithoutBody = {
      ...createRequest({}),
      body: undefined,
      originalUrl: '/rbac/roles/12',
      params: { id: '12' },
    };
    const systemLogEntry = buildSystemAuditEntry({
      definition: {
        name: '修改权限组',
        action: 'update',
        subject: 'rbac',
        targetType: 'role',
        targetParameter: 'id',
        targetNameField: 'name',
      },
      request: requestWithoutBody,
      responseBody: { id: 12, name: 'production', description: 'updated' },
      status: 'succeeded',
      statusCode: 201,
    });

    expect(systemLogEntry.targetName).toBe('production');
    expect(systemLogEntry.description).toBe('admin 修改权限组 production');
  });

  it('登录成功从安全字段还原操作者且不记录密码', () => {
    const systemLogEntry = buildSystemAuditEntry({
      definition: {
        name: '登录系统',
        action: 'login',
        subject: 'auth',
        targetType: 'user',
        actorUsernameBodyField: 'username',
        actorUserIdResponsePath: 'user.id',
        actorUsernameResponsePath: 'user.username',
      },
      request: {
        ...createRequest({
          username: 'alice',
          password: 'must-not-appear',
        }),
        user: undefined,
      },
      responseBody: {
        token: 'must-not-appear-either',
        user: { id: 20, username: 'alice' },
      },
      status: 'succeeded',
      statusCode: 201,
    });

    expect(systemLogEntry.actorUserId).toBe(20);
    expect(systemLogEntry.actorUsername).toBe('alice');
    expect(systemLogEntry.description).toBe('alice 登录系统');
    expect(JSON.stringify(systemLogEntry)).not.toContain('must-not-appear');
  });

  it('登录失败保留尝试的用户名但不读取密码', () => {
    const systemLogEntry = buildSystemAuditEntry({
      definition: {
        name: '登录系统',
        action: 'login',
        subject: 'auth',
        targetType: 'user',
        actorUsernameBodyField: 'username',
        actorUserIdResponsePath: 'user.id',
        actorUsernameResponsePath: 'user.username',
      },
      request: {
        ...createRequest({
          username: 'missing-user',
          password: 'must-not-appear',
        }),
        user: undefined,
      },
      status: 'failed',
      statusCode: 401,
      errorMessage: '用户名或密码错误',
    });

    expect(systemLogEntry.actorUserId).toBe(0);
    expect(systemLogEntry.actorUsername).toBe('missing-user');
    expect(systemLogEntry.description).toBe('missing-user 登录系统 [失败]');
    expect(JSON.stringify(systemLogEntry)).not.toContain('must-not-appear');
  });

  it('读取日志只采集声明的安全查询字段', () => {
    const systemLogEntry = buildSystemAuditEntry({
      definition: {
        name: '读取系统日志',
        action: 'read',
        subject: 'system-log',
        targetType: 'system-log',
        metadataQueryFields: ['actorUsername', 'status'],
      },
      request: {
        ...createRequest({}),
        method: 'GET',
        originalUrl: '/system-logs?actorUsername=operator&status=failed',
        query: {
          actorUsername: 'operator',
          status: 'failed',
          ignored: 'secret',
        },
      },
      status: 'succeeded',
      statusCode: 200,
    });

    expect(systemLogEntry.metadata).toEqual({
      actorUsername: 'operator',
      status: 'failed',
    });
    expect(systemLogEntry.description).toContain(
      '(actorUsername="operator", status="failed")',
    );
    expect(JSON.stringify(systemLogEntry)).not.toContain('secret');
  });
});
