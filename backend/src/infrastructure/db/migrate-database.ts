import { Logger } from '@nestjs/common';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Pool } from 'pg';

// 源码与编译产物都定位到 backend/drizzle，不依赖启动命令所在目录。
const MIGRATIONS_DIRECTORY = resolve(__dirname, '../../../drizzle');
const MIGRATION_LOCK_NAME = 'admin-base:database-migrations';
const logger = new Logger('DatabaseMigration');

export async function migrateDatabase(connectionPool: Pool): Promise<void> {
  const connection = await connectionPool.connect();
  try {
    logger.log('等待数据库迁移锁');
    await connection.query('SELECT pg_advisory_lock(hashtext($1))', [
      MIGRATION_LOCK_NAME,
    ]);
    await migrate(drizzle(connection), {
      migrationsFolder: MIGRATIONS_DIRECTORY,
    });
    logger.log('数据库迁移完成');
  } finally {
    // 专用连接退出即释放会话锁，失败时也不能把仍持锁的连接放回池中。
    connection.release(true);
  }
}
