# High-Throughput Flash Sale System

A single-product flash sale built for **crazy concurrency** no overselling, no duplicate purchases, and no “sorry, your order vanished” moments. Designed to **fail gracefully, not dramatically** when dependencies decide to take a coffee break.

**Stack:** Turborepo · NestJS · React (react-router) · PostgreSQL · Redis ·
RabbitMQ · Docker Compose · k6

---

## Table of contents

- [Design choices and trade-offs](#design-choices-and-trade-offs)
- [System diagram](#system-diagram)
- [Getting started](#getting-started)
- [Write path: Redis, then RabbitMQ, then Postgres](#write-path-redis-then-rabbitmq-then-postgres)
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

- Node.js + npm
- Docker + Docker Compose

The Kubernetes path (see below) also needs `kind`, `kubectl`, `kubeconform`,
and optionally `k6`. `npm install` detects and installs whatever's missing —
on Linux and macOS — so there's nothing to set up by hand beyond Node and
Docker; set `SKIP_DEPS_CHECK=1` to skip that check entirely, or run it on
demand with `npm run setup:deps`. See
[scripts/check-deps.sh](scripts/check-deps.sh) for how it works.

### 1. Local development

```bash
npm install

# Copy the example env if you don't already have a local .env
cp .env.example .env

# Start Postgres + Redis, apply migrations, seed sample products, then
# load every active/upcoming sale into Redis - the purchase endpoint's
# fast path only engages for a sale that's been warmed; a cold sale just
# falls through to the same Postgres flow as before Redis existed
npm run setup

# Run every app (web + api) together via Turbo
npm run dev
```

> NOTE: If you've changed `packages/database/src/schema.ts`, generate a migration for it first with `npm run -w @workspace/database db:generate`. that's a schema-authoring step, not part of `npm run setup`, since a bootstrap on an unchanged schema shouldn't be creating migration files.

### 2. Running tests

#### Unit tests

```bash
npm run test          # every workspace with a test script

npm run -w web test   # React components/hooks
npm run -w api test   # NestJS controllers/services
```

#### End-to-end tests

```bash
npm run test:e2e -- -- --reporter=tree
```

## Write path: Redis, then RabbitMQ, then Postgres

A purchase Redis confirms isn't written to Postgres inline - it's published
to RabbitMQ and the API responds immediately. A separate worker
(`apps/worker`) drains the queue into Postgres in batches, which is what
keeps Postgres from being the throughput ceiling under a thundering herd.

Retries are simple by design: a failed batch retries a few times, then
dead-letters. There's no reconciliation - a dead-lettered write is a lost
purchase, logged and left. One visible consequence: the stock count and
order history you see can lag behind Redis by roughly the queue depth
during a burst, since Postgres is now catching up asynchronously instead
of updating inline.

## Running the stress test (k6)

Load tests target the Kubernetes cluster, not local dev. Deploy the cluster first, see [k8s/README.md](k8s/README.md).

```bash
k8s/scripts/load-test.sh                     # default suite: smoke then flash-sale-spike
k8s/scripts/load-test.sh smoke               # 1 VU, 30s, sanity check
k8s/scripts/load-test.sh flash-sale-spike    # thundering herd on a stock limited sale
```

The script builds the workspace, port forwards Postgres and Redis so the test can seed data and verify results, and points at the Ingress by default (`http://localhost:8080/api`), so it measures the real deployed system, load balanced across both api pods.

Each run seeds a fresh sale, warms Redis, runs k6, checks the correctness invariants (no overselling, no duplicate purchases) directly against Postgres, then cleans up. Results land in `packages/load-test/results/<label>/` as a markdown summary (`<test>.md`) plus the raw metrics one level deeper (`json/<test>.json`).

### Env vars

| Var                      | What it does                                               | Default                     |
| ------------------------ | ---------------------------------------------------------- | --------------------------- |
| `ARRIVAL_RATE`           | Target requests per second                                 | 1250                        |
| `RAMP_SECONDS`           | Ramp up and ramp down duration, same value for both if set | 10 up, 20 down              |
| `DURATION_SECONDS`       | Sustained duration at the target rate                      | 120                         |
| `MAX_VUS`                | Max concurrent virtual users k6 can use                    | 5000                        |
| `STOCK`                  | Overrides the sale's starting stock                        | depends on the test         |
| `RESULTS_LABEL`          | Names the results folder                                   | today's date                |
| `EMAIL_REPEAT_SHARE`     | Share of requests that reuse an existing email             | 0.3                         |
| `EMAIL_REPEAT_POOL_SIZE` | Size of the reused email pool                              | 200                         |
| `BASE_URL`               | Overrides the target URL                                   | `http://localhost:8080/api` |
| `PG_LOCAL_PORT`          | Local port for the Postgres port forward                   | 15432                       |
| `REDIS_LOCAL_PORT`       | Local port for the Redis port forward                      | 16379                       |

### Example: 800, 1600, 3200 req/s

```bash
MAX_VUS=20000 ARRIVAL_RATE=800 DURATION_SECONDS=30 STOCK=80000 RESULTS_LABEL=k8s-spike-800rps \
  k8s/scripts/load-test.sh flash-sale-spike

MAX_VUS=20000 ARRIVAL_RATE=1600 DURATION_SECONDS=30 STOCK=160000 RESULTS_LABEL=k8s-spike-1600rps \
  k8s/scripts/load-test.sh flash-sale-spike

MAX_VUS=20000 ARRIVAL_RATE=3200 DURATION_SECONDS=30 STOCK=320000 RESULTS_LABEL=k8s-spike-3200rps \
  k8s/scripts/load-test.sh flash-sale-spike
```

`STOCK` is set well above the expected request volume so the run measures real purchase throughput, not the cheap sold out response. `MAX_VUS` is raised from the 5000 default so k6 itself does not become the bottleneck before the API does.
