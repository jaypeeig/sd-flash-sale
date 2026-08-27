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

cp .env.example .env

# Start Postgres + Redis
# Generate + apply migrations, then seed sample products
# Sync Redis with active and upcoming sales data
npm run -w @workspace/database db:setup

# Run development servers (web + api)
# React app  → http://localhost:5173
# NestJS API → http://localhost:3000/api
npm run dev
```

### 2. Running tests

#### Unit tests

```bash

# React app  → npm run -w web test
# NestJS API → npm run -w api test
npm run test -- -- --reporter=tree
```

#### End-to-end tests

```bash
npm run test:e2e -- -- --reporter=tree
```

## Running the stress test (k6)

Run the API in production mode first — `nest start --watch` isn't representative of real throughput:

```bash
npm run -w @workspace/database db:setup
npm run -w api build && npm run -w api start
```

Run with no arguments for the default suite (smoke first as a fail-fast gate, then flash-sale-spike), or name one test to run just that:

```bash
npm run load-test                       # the default suite: smoke -> flash-sale-spike

npm run load-test -- smoke              # 1 VU, 30s — sanity check, safe for CI
npm run load-test -- flash-sale-spike   # thundering herd on a stock-5000 sale: 10s ramp up, 2m sustained, 20s ramp down, 1000 req/s
npm run load-test -- capacity-ramp      # diagnostic only (not in the default suite, ~5.5 min): steps the rate through flat plateaus to find where latency actually breaks
```
