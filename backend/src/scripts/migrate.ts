import { Pool } from 'pg';
import { ConfigService } from '../infrastructure/config/config.service';
import { migrateDatabase } from '../infrastructure/db/migrate-database';

// 手动迁移与后端启动复用同一路径和数据库锁。
async function main() {
  const configuration = new ConfigService();
  const connectionPool = new Pool(configuration.db);
  try {
    await migrateDatabase(connectionPool);
  } finally {
    await connectionPool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
