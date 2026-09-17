import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '../config/config.service';

// 授权缓存；Redis 不可用时快速失败，由缓存服务回源 PostgreSQL。
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  readonly client: Redis;

  constructor(configuration: ConfigService) {
    this.client = new Redis({
      host: configuration.redis.host,
      port: configuration.redis.port,
      password: configuration.redis.password ?? undefined,
      db: configuration.redis.db,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      commandTimeout: 5000,
    });
    // 监听 error,避免未处理的 error 事件;断连本身不致命
    this.client.on('error', (error) =>
      this.logger.warn(`redis: ${error.message}`),
    );
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
