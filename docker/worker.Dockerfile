FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/queue/package.json packages/queue/package.json
RUN npm ci

FROM deps AS build
COPY . .

RUN npx turbo run build --filter=@workspace/worker

FROM build AS prod-deps
RUN npm prune --omit=dev

FROM base AS worker
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/package.json ./

COPY --from=build /app/apps/worker/package.json apps/worker/package.json
COPY --from=build /app/apps/worker/dist apps/worker/dist

COPY --from=build /app/packages/database/package.json packages/database/package.json
COPY --from=build /app/packages/database/dist packages/database/dist

COPY --from=build /app/packages/queue/package.json packages/queue/package.json
COPY --from=build /app/packages/queue/dist packages/queue/dist

WORKDIR /app/apps/worker
USER node
CMD ["node", "dist/main.js"]
