import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { migrateDatabase } from './migrate-database';

jest.mock('drizzle-orm/node-postgres', () => ({ drizzle: jest.fn() }));
jest.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: jest.fn(),
}));

describe('启动数据库迁移', () => {
  const connection = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const connect = jest.fn();
  const connectionPool = { connect } as unknown as Pool;
  const database = {} as ReturnType<typeof drizzle>;

  beforeEach(() => {
    jest.resetAllMocks();
    connect.mockResolvedValue(connection);
    connection.query.mockResolvedValue(undefined);
    jest.mocked(drizzle).mockReturnValue(database);
  });

  it('获得同一连接上的锁后才迁移，完成后销毁连接以释放锁', async () => {
    jest.mocked(migrate).mockImplementation(async () => {
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_lock(hashtext($1))',
        ['admin-base:database-migrations'],
      );
      expect(drizzle).toHaveBeenCalledWith(connection);
      expect(connection.release).not.toHaveBeenCalled();
      await Promise.resolve();
    });

    await migrateDatabase(connectionPool);

    expect(migrate).toHaveBeenCalledWith(database, {
      migrationsFolder: resolve(__dirname, '../../../drizzle'),
    });
    expect(connection.release).toHaveBeenCalledWith(true);
  });

  it('迁移失败时向启动入口抛错，仍释放持锁连接', async () => {
    const migrationError = new Error('migration SQL failed');
    jest.mocked(migrate).mockRejectedValue(migrationError);

    await expect(migrateDatabase(connectionPool)).rejects.toBe(migrationError);
    expect(connection.release).toHaveBeenCalledWith(true);
  });

  it('获取锁失败时不执行迁移，并释放连接', async () => {
    const lockError = new Error('lock failed');
    connection.query.mockRejectedValue(lockError);

    await expect(migrateDatabase(connectionPool)).rejects.toBe(lockError);
    expect(migrate).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledWith(true);
  });

  it('数据库连接失败时向启动入口抛错', async () => {
    const connectionError = new Error('connection refused');
    connect.mockRejectedValue(connectionError);

    await expect(migrateDatabase(connectionPool)).rejects.toBe(connectionError);
    expect(migrate).not.toHaveBeenCalled();
    expect(connection.release).not.toHaveBeenCalled();
  });
});
