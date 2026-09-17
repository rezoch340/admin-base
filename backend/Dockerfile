FROM node:24-alpine AS dependencies
WORKDIR /app/backend
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

FROM dependencies AS initialization
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle
CMD ["sh", "-c", "pnpm db:migrate && pnpm seed:admin"]

FROM node:24-alpine AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --chown=node:node drizzle ./drizzle
USER node
EXPOSE 3100
CMD ["node", "dist/main.js"]
