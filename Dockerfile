FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY prisma ./prisma
RUN pnpm prisma generate
RUN pnpm build
RUN pnpm prune --prod

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 3000

CMD ["node", "dist/main.js"]

