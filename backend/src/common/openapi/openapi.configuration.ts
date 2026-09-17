import { DocumentBuilder } from '@nestjs/swagger';

export const ADMINISTRATOR_JWT_SECURITY_NAME = 'adminJwt';

export function buildOpenApiConfiguration() {
  return new DocumentBuilder()
    .setTitle('Admin Base API')
    .setDescription('通用后台底座：登录认证、账号管理、角色权限与系统审计。')
    .setVersion('0.1.0')
    .setContact(
      'R2RPC Contributors',
      'https://github.com/rezoch340/admin-base',
      '',
    )
    .setLicense(
      'UNLICENSED',
      'https://github.com/rezoch340/admin-base/blob/main/LICENSE',
    )
    .addServer('/', '当前部署')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '后台登录接口签发的 JWT。',
      },
      ADMINISTRATOR_JWT_SECURITY_NAME,
    )
    .addTag('auth', '后台账号登录和当前身份')
    .addTag('users', '后台账号管理')
    .addTag('rbac', '权限组、权限和用户授权')
    .addTag('system-logs', '后台系统操作审计')
    .build();
}
