import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SystemAuditInterceptor } from './common/interceptors/system-audit.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { AuthModule } from './application/auth/auth.module';
import { UsersModule } from './application/users/users.module';
import { RbacModule } from './application/rbac/rbac.module';
import { ConfigModule } from './infrastructure/config/config.module';
import { DbModule } from './infrastructure/db/db.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { SystemLogsModule } from './application/system-logs/system-logs.module';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    RedisModule,
    RbacModule,
    AuthModule,
    UsersModule,
    SystemLogsModule,
  ],
  providers: [
    // 全局鉴权:先 JWT(@Public 跳过),再 Permission(@RequirePermission 校验,fail-closed)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: SystemAuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
