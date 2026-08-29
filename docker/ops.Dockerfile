FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
COPY packages/database/package.json packages/database/package.json
COPY packages/redis/package.json packages/redis/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
# XXX: --ignore-scripts skips root's postinstall (scripts/check-deps.sh)
RUN npm ci --ignore-scripts

FROM deps AS ops
COPY . .

RUN npx turbo run build --filter=@workspace/database --filter=@workspace/redis
