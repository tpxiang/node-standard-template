# Standard Enterprise Node Backend

标准企业级 Node.js API 服务模板，当前分支使用 MySQL 8。

## 运行要求

- Node.js 22+
- pnpm 9+
- Docker（用于 PostgreSQL 和 Redis）

## 快速开始

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm prisma migrate dev --name init
pnpm prisma:seed
pnpm dev
```

服务地址：

```text
API: http://localhost:3000
Swagger: http://localhost:3000/docs
Liveness: http://localhost:3000/health/live
Readiness: http://localhost:3000/health/ready
```

## 示例账号

执行 seed 后：

```text
email: admin@example.com
password: ChangeMe123!
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

## 分支说明

当前是 MySQL 兼容分支：

```bash
git branch --show-current
```

MySQL 分支独立维护 Prisma provider、migration 和 Docker Compose。PostgreSQL 主线请切换到 `main`。
