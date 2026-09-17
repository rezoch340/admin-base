import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, isNull } from 'drizzle-orm';
import { Pool } from 'pg';
import { ConfigService } from '../infrastructure/config/config.service';
import { users } from '../application/users/users.schema';
import {
  permissions,
  rolePermissions,
  roles,
} from '../application/rbac/rbac.schema';
import { hashPassword } from '../common/utils/password';

// 种子管理员与通用权限目录，可重复执行。

// 权限全集(action, subject, description)
const ALL_PERMISSIONS: Array<{
  action: string;
  subject: string;
  description: string;
}> = [
  { action: 'read', subject: 'user', description: '查看后台账号' },
  { action: 'create', subject: 'user', description: '创建后台账号' },
  { action: 'delete', subject: 'user', description: '删除后台账号' },
  {
    action: 'update',
    subject: 'user',
    description: '修改后台账号资料、密码和启用状态',
  },
  {
    action: 'read',
    subject: 'system-log',
    description: '查看系统操作审计日志',
  },
  { action: 'read', subject: 'rbac', description: '查看权限组和权限目录' },
  {
    action: 'manage',
    subject: 'rbac',
    description: '管理权限组、权限目录和用户分组',
  },
];

// operator 权限组只挂 read/* 权限(只读,无 create/delete/invoke/manage)
const OPERATOR_PERMISSIONS = ALL_PERMISSIONS.filter(
  (permission) => permission.action === 'read',
);

async function main() {
  const configuration = new ConfigService();
  const connectionPool = new Pool(configuration.db);
  const database = drizzle(connectionPool);

  const { username, password } = configuration.bootstrap.admin;

  await database
    .insert(users)
    .values({
      username,
      passwordHash: hashPassword(password),
      role: 'admin',
      isRoot: true,
    })
    .onConflictDoNothing();
  // 若管理员已存在(上面 onConflictDoNothing 跳过),补一次置 root,保证幂等重跑也生效
  await database
    .update(users)
    .set({ isRoot: true })
    .where(eq(users.username, username));

  console.log(`管理员已就绪: ${username} (isRoot: true)`);

  // 权限全集(幂等,唯一约束 action+subject)
  await database
    .insert(permissions)
    .values(ALL_PERMISSIONS)
    .onConflictDoNothing();
  // 已存在的种子权限也补齐最新说明，保证幂等重跑能修复历史空值。
  for (const permissionDefinition of ALL_PERMISSIONS) {
    await database
      .update(permissions)
      .set({ description: permissionDefinition.description })
      .where(
        and(
          eq(permissions.action, permissionDefinition.action),
          eq(permissions.subject, permissionDefinition.subject),
          isNull(permissions.deletedAt),
        ),
      );
  }
  const permissionRecords = await database.select().from(permissions);
  const permissionIdByKey = new Map(
    permissionRecords.map((permission) => [
      `${permission.action}:${permission.subject}`,
      permission.id,
    ]),
  );

  // operator 权限组(幂等)
  await database
    .insert(roles)
    .values({ name: 'operator', description: '只读权限组:仅拥有 read/* 权限' })
    .onConflictDoNothing();
  const [operatorRole] = await database
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'operator'))
    .limit(1);

  // operator 权限组挂 read/* 权限(幂等)
  for (const permission of OPERATOR_PERMISSIONS) {
    const permissionId = permissionIdByKey.get(
      `${permission.action}:${permission.subject}`,
    );
    if (!operatorRole || !permissionId) {
      continue;
    }
    await database
      .insert(rolePermissions)
      .values({ roleId: operatorRole.id, permissionId })
      .onConflictDoNothing();
  }

  console.log(
    `RBAC 已就绪: 权限 ${permissionRecords.length} 条, operator 权限组挂 read/* 共 ${OPERATOR_PERMISSIONS.length} 条`,
  );

  await connectionPool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
