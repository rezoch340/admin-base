# Admin Base 后端

NestJS 通用后台 API，包含 `auth`、`users`、`rbac`、`system-logs` 四个应用模块。使用 PostgreSQL / Drizzle 保存数据，Redis 缓存用户授权。

先按上一级 [README](../README.md) 准备 `config.yaml` 并启动数据库与 Redis，再在本目录运行：

```bash
pnpm install --frozen-lockfile
pnpm dev:api
```

开发和生产启动都会在开放 HTTP 端口前自动执行未应用的数据库迁移。重复启动不会重复执行历史迁移，多实例通过 PostgreSQL 锁串行迁移；失败会终止启动并返回非零退出码。首次启动成功后，在另一个终端执行 `pnpm seed:admin` 初始化管理员。

默认端口 `3100`，API 文档在 `/docs`。源码和编译产物都默认读取 `admin-base/config.yaml`，可使用 `CONFIG_FILE` 显式覆盖；不会向上查找原项目配置。

```bash
pnpm lint:check
pnpm test --runInBand
pnpm build
pnpm start:prod
```

在本目录执行 `pnpm db:generate` 生成新迁移，下次启动会自动应用，也可用 `pnpm db:migrate` 提前执行；手动迁移与启动共用数据库锁。`pnpm openapi:gen` 导出 `docs/openapi.yaml` 时不执行迁移。现有初始迁移只适用于新数据库。

Docker 默认镜像包含编译产物和迁移文件，仍直接启动后端，由后端代码完成自动迁移。原有 `initialization` 构建目标可用于手动迁移和种子，不是启动必需步骤。容器工作目录是 `/app/backend`，需将独立配置挂载至 `/app/config.yaml`，数据库与 Redis 主机填写容器可访问地址。
