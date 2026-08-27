# High-Throughput Flash Sale System

A single-product flash sale built for **crazy concurrency** no overselling, no duplicate purchases, and no “sorry, your order vanished” moments. Designed to **fail gracefully, not dramatically** when dependencies decide to take a coffee break.

**Stack:** Turborepo · NestJS · React (react-router) · PostgreSQL · Redis ·
Docker Compose · k6

---

## Table of contents

- [Design choices and trade-offs](#design-choices-and-trade-offs)
- [System diagram](#system-diagram)
- [Getting started](#getting-started)
- [Running the stress test (k6)](#running-the-stress-test-k6)

---

## Design choices and trade-offs

> _Placeholder — to follow._

---

## System diagram

> _Placeholder — to follow._

---

## Getting started

### Prerequisites

- Node.js
- Docker + Docker Compose
- npm

### 1. Local development

```bash
npm install

# Copy the example env if you don't already have a local .env
cp .env.example .env

# Start Postgres (waits until it reports healthy)
docker compose up -d

# Generate + apply migrations, then seed some sample products
npm run -w @workspace/database db:generate
npm run -w @workspace/database db:migrate
npm run -w @workspace/database db:seed

# Run every app (web + api) together via Turbo
npm run dev
```

Stop the database with `docker compose down` (add `-v` to also drop its volume and start from an empty DB).

To run a single app instead of the whole graph, target its workspace directly with `-w`:

```bash
npm run -w web dev   # React app  → http://localhost:5173
npm run -w api dev   # NestJS API → http://localhost:3000/api
```

### 2. Running tests

#### Unit tests

`web` and `api` each run their own suite with [Vitest](https://vitest.dev). Run every workspace's suite via Turbo, or target one directly:

```bash
npm run test          # every workspace with a test script (web + api)

npm run -w web test   # React components/hooks
npm run -w api test   # NestJS controllers/services
```

## Running the stress test (k6)
