# Admin Base 前端

独立通用后台，使用 Next.js、React、TypeScript、Tailwind CSS 和 shadcn/ui。包含登录、响应式菜单、后台账号、权限组与权限目录、本人改密、系统日志，以及通用表格、筛选、分页和弹窗组件。

在 `admin-base/` 中准备好 `config.yaml` 并启动后端，再运行：

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

前端默认监听 `3101`，API 默认使用浏览器当前主机的 `3100` 端口。服务端默认只读取 `../config.yaml`；可用 `CONFIG_FILE=/绝对路径/config.yaml` 指定配置。`frontend.apiUrl` 可指定完整 API 地址，跨主机部署需同步配置后端 CORS。登录账号由底座配置中的管理员设置初始化。

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

`pnpm test:e2e` 会启动前端，并通过真实公开 API 验证登录、权限页面、通配权限、筛选分页、改密入口和移动导航。后端需先启动；使用 `E2E_USERNAME`、`E2E_PASSWORD` 指定配置中的种子管理员账号。`E2E_API_URL` 必须与配置中浏览器实际访问的 API 地址一致；自定义 `E2E_FRONTEND_PORT` 时需同步配置后端 CORS。已有前端服务可设 `E2E_REUSE_EXISTING_SERVER=true`。

所有业务接口集中在 `lib/api-client.ts` 调用，页面权限由 `lib/auth.tsx` 与 `PermissionBoundary` 控制。新增管理页面时，在 `components/app-shell.tsx` 增加导航，并为对应后端接口设置资源权限。首页仅展示本地入口，不依赖业务统计接口。

Docker 使用当前目录作为构建上下文，运行时挂载配置至 `/app/config.yaml`，监听 `3101`。前后端统一运行说明见上一级 README。
