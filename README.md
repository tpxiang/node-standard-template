# Standard Enterprise Node Backend

标准企业级 Node.js API 服务模板，当前分支使用 MySQL 8。

## 运行要求

- Node.js 22+
- pnpm 9+
- Docker（用于 MySQL 和 Redis）

## 快速开始

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm prisma migrate deploy
pnpm prisma:seed
pnpm dev
```

开发环境也可使用：

```bash
pnpm prisma migrate dev
```

服务地址：

```text
API: http://localhost:3000
Swagger: http://localhost:3000/docs（非 production）
Liveness: http://localhost:3000/health/live
Readiness: http://localhost:3000/health/ready
```

## 认证接口

| 方法 | 路径            | 说明                                        |
| ---- | --------------- | ------------------------------------------- |
| POST | `/auth/login`   | 登录，返回 access/refresh token             |
| POST | `/auth/refresh` | 刷新 token（旋转 + 防重放）                 |
| POST | `/auth/logout`  | 吊销 refresh；若带 Bearer access 则同时拉黑 |

登录失败累计 5 次会触发 Redis 限流（15 分钟），同时接口层有 Throttler 限流。

## 接口入参约定

- **GET**：只允许 **Query** 传参，禁止 path / body 业务入参。
- **增删改**：统一 **POST**，只允许 **Body** 传参，禁止 path / query 业务入参。
- 健康检查等无业务入参的 GET 除外。

## 用户与角色

| 方法 | 路径 | 权限 | 入参 |
| ---- | ---- | ---- | ---- |
| GET | `/users/list` | `user:read` | query 分页 |
| GET | `/users/detail` | `user:read` | query `id` |
| POST | `/users/create` | `user:write` | body |
| POST | `/users/update` | `user:write` | body（含 `id`） |
| GET | `/roles/list` | `role:read` | — |
| GET | `/roles/detail` | `role:read` | query `id` |
| POST | `/roles/assign-user` | `role:write` | body `userId`/`roleId` |

## 示例账号

执行 seed 后：

```text
email: admin@example.com
password: ChangeMe123!
permissions: user:read, user:write, role:read, role:write
```

生产环境必须修改 seed 密码并通过安全的密钥管理系统注入 JWT Secret。

## 目录说明

- `src/config`：配置和环境变量校验。
- `src/common`：跨模块基础设施。
- `src/database`：Prisma 数据库模块。
- `src/infrastructure`：Redis、日志等基础设施。
- `src/modules`：业务模块。
- `prisma`：schema、migration 和 seed。
- `deploy`：Docker Compose 与 Kubernetes 配置。

## 质量检查

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

真实链路 e2e（需本地 Postgres/Redis，且已 migrate + seed）：

```bash
pnpm test:e2e:flow
```

## 分支说明

当前是 MySQL 兼容分支：

```bash
git branch --show-current
```

MySQL 分支独立维护 Prisma provider、migration 和 Docker Compose。PostgreSQL 主线请切换到 `main`。
