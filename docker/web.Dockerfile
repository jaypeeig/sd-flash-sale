FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

FROM deps AS build
COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npx turbo run build --filter=web

FROM nginx:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
