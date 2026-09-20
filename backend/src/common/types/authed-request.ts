import type { AuthenticatedUser } from '../../application/rbac/entity/model';

// 经守卫填充的请求上下文——只声明我们读写的字段,避免 getRequest() 返回 any 导致的 unsafe 访问。

export interface AuthenticatedRequestHeaders extends Record<
  string,
  string | string[] | undefined
> {
  'accept-language'?: string;
  authorization?: string;
  'user-agent'?: string;
  'x-forwarded-for'?: string | string[];
}

export interface AuthedRequest {
  body?: Record<string, unknown>;
  headers: AuthenticatedRequestHeaders;
  ip?: string;
  method: string;
  originalUrl: string;
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  socket: { remoteAddress?: string };
  user?: AuthenticatedUser; // JwtStrategy.validate 填充
  systemAuditRecorded?: boolean;
}
