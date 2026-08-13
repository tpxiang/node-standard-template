# Standard Enterprise Node Backend

标准企业级 Node.js API 服务模板，当前主线使用 PostgreSQL。

## 运行要求

- Node.js 22+
- pnpm 9+
- Docker（用于 PostgreSQL 和 Redis）

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
Swagger: http://localhost:3000/docs
Liveness: http://localhost:3000/health/live
Readiness: http://localhost:3000/health/ready
```

## 认证接口

| 方法 | 路径            | 说明                            |
| ---- | --------------- | ------------------------------- |
| POST | `/auth/login`   | 登录，返回 access/refresh token |
| POST | `/auth/refresh` | 刷新 token（旋转 + 防重放）     |
| POST | `/auth/logout`  | 吊销 refresh token              |

登录失败累计 5 次会触发 Redis 限流（15 分钟），同时接口层有 Throttler 限流。

## 示例账号

执行 seed 后：

```text
email: admin@example.com
password: ChangeMe123!
permissions: user:read, user:write
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

## MySQL 分支

PostgreSQL 是主线。MySQL 作为独立分支维护：

```bash
git switch mysql
```

MySQL 分支需要独立维护 Prisma provider、migration 和 Docker Compose，并执行数据库兼容性 smoke test。
