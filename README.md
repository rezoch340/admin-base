# Admin Base

从 [R2RPC](https://github.com/rezoch340/R2RPC) 提取的独立通用后台底座。前后端源码、依赖锁文件、配置示例和数据库迁移都在本仓库，可独立克隆、运行和开发。

## 包含的能力

- 登录、JWT 会话、账号信息、密码修改、账号启停和删除。
- 用户、权限组、权限目录和用户权限组分配；前端按权限显示入口，后端强制鉴权。
- 超级管理员保护、授权缓存及权限变更后的缓存失效。
- 系统操作日志，记录登录、读取、写入和拒绝访问；筛选与分页。
- 响应式后台布局、移动导航、表格、筛选、分页、确认与表单弹窗。
- PostgreSQL / Drizzle、Redis、配置校验、统一异常处理和 Swagger API 文档。

本仓库的 `frontend/` 与 `backend/` 只包含通用后台能力。底座没有设备、功能组、RPC、访问令牌、设备令牌、请求载荷日志、指标、WebSocket、Worker、BullMQ 或 Manticore 模块。

## 目录

```text
admin-base/
├── frontend/             # Next.js 16 + React 19 + Tailwind CSS 4
├── backend/              # NestJS 11 + Drizzle + PostgreSQL + Redis
│   ├── src/application/  # auth / users / rbac / system-logs
│   └── drizzle/          # 仅通用后台表的初始迁移
├── tests/api-smoke.mjs   # 公开 HTTP API 集成验证
├── config.example.yaml  # 前后端共用配置示例
├── compose.yaml         # 本地 PostgreSQL / Redis
└── package.json         # 统一开发、构建与检查入口
```

## 启动

要求 Node.js 24、pnpm 11.17.0，以及 Docker Compose（或自行提供 PostgreSQL 16 和 Redis 7）。以下命令都在 `admin-base/` 内执行。

```bash
git clone git@github.com:rezoch340/admin-base.git
cd admin-base
cp config.example.yaml config.yaml
pnpm run setup
docker compose up -d --wait
```

启动后端；后端会在监听端口前自动执行 `backend/drizzle/` 中尚未应用的迁移：

```bash
pnpm dev:backend
```

首次启动成功后，在另一个终端初始化管理员，再启动前端：

```bash
pnpm seed:admin
pnpm dev:frontend
```

后台：[http://localhost:3101](http://localhost:3101)，API：[http://localhost:3100](http://localhost:3100)，Swagger：[http://localhost:3100/docs](http://localhost:3100/docs)。示例管理员是 `admin` / `admin123456`；初始化前可修改 `bootstrap.admin`。示例使用独立数据库 `admin_base`，PostgreSQL 端口 `55432`、Redis 端口 `56379`，可与原项目同时运行。

`config.yaml` 不进版本控制；部署前替换示例管理员密码、JWT 密钥和数据库密码。`compose.yaml` 中的数据库账号需与配置同步。前后端默认只读取本底座的配置，也可用 `CONFIG_FILE` 显式指定配置文件。浏览器只会收到 `frontend.apiUrl` 和 `frontend.apiPort`，不会收到后端密钥。局域网访问时，将实际前端地址加入 `app.corsOrigins`。

初始迁移用于**全新数据库**，不用于升级已有 R2RPC 数据库。开发和生产启动都会自动迁移，重复启动跳过已应用的迁移；多个实例通过 PostgreSQL 锁串行执行，迁移失败会以非零状态退出，不开放 API 端口。仍可用 `pnpm db:migrate` 提前手动迁移。

管理员种子继续由 `pnpm seed:admin` 显式执行，创建超级管理员、七项通用权限与 `operator` 只读权限组；重复执行不会重置已存在管理员的密码。

## 验证

```bash
pnpm lint
pnpm test
pnpm build

# API 已启动并完成迁移、种子后：
SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin123456 pnpm test:api

# 安装浏览器后执行 UI 测试（API 需保持运行）：
pnpm --dir frontend exec playwright install chromium
E2E_PASSWORD=admin123456 pnpm test:e2e
```

API 测试通过 `SMOKE_ADMIN_USERNAME`、`SMOKE_ADMIN_PASSWORD` 指定实际管理员凭据，可用 `BASE_URL` 覆盖默认 API 地址。UI 测试使用 `E2E_USERNAME`、`E2E_PASSWORD` 指定实际管理员凭据；自定义端口时，`E2E_API_URL` 必须与 `config.yaml` 中浏览器实际使用的 API 地址一致，并将 `E2E_FRONTEND_PORT` 对应的前端地址加入 CORS。测试会创建专用账号和权限组并在结束时清理，审计日志会保留。

## 扩展业务

1. 后端在 `backend/src/application/` 新建模块，并加入 `AppModule`。新接口通过 `@RequirePermission(action, subject)` 声明权限；只需登录的接口用 `@AuthenticatedOnly()`，公开接口显式用 `@Public()`。
2. 业务表放在对应模块的 `*.schema.ts` 中，在 `backend/` 执行 `pnpm db:generate`，将生成的 SQL 与元数据一同提交。下次启动自动迁移，也可执行 `pnpm db:migrate` 立即应用；修改 schema 不会自动生成 SQL。
3. 将业务权限加入种子，或由超级管理员在权限目录创建，并分配给权限组。种子中的超级管理员拥有全权限，普通账号靠权限组授权。
4. 前端在 `frontend/app/(dashboard)/` 添加页面，在 `components/app-shell.tsx` 添加导航，复用 `lib/api-client.ts`、权限判断与表格组件。
5. 需要审计的操作加 `@SystemAudit(...)`，仅配置允许记录的字段；读取日志的默认资源映射在 `common/interceptors/system-audit-definition.ts`。

保留原项目的版权与来源说明，见本目录的 `LICENSE` 和 `NOTICE`。
