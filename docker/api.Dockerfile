FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/redis/package.json packages/redis/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

FROM deps AS build
COPY . .

RUN npx turbo run build --filter=api

FROM build AS prod-deps
RUN npm prune --omit=dev

FROM base AS api
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/package.json ./

COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist

COPY --from=build /app/packages/database/package.json packages/database/package.json
COPY --from=build /app/packages/database/dist packages/database/dist

COPY --from=build /app/packages/redis/package.json packages/redis/package.json
COPY --from=build /app/packages/redis/dist packages/redis/dist
COPY --from=build /app/packages/redis/lua packages/redis/lua

COPY --from=build /app/packages/shared-types/package.json packages/shared-types/package.json
COPY --from=build /app/packages/shared-types/src packages/shared-types/src

WORKDIR /app/apps/api
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
