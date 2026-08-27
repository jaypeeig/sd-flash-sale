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

#### End-to-end tests

`api` also has an e2e suite that boots the real NestJS app against a real Postgres database and drives it over HTTP with [supertest](https://github.com/ladjs/supertest) - including concurrency tests that fire many simultaneous purchases at once to prove no overselling and no duplicate purchases. It's kept separate from the unit suite above (its own Vitest config) so the fast unit run never needs Docker.

```bash
npm run test:e2e -- -- --reporter=tree
```

## Running the stress test (k6)

`packages/load-test` drives the running API with [k6](https://k6.io) — native TypeScript, no build step. It needs either a local `k6` binary or Docker (falls back to `docker run grafana/k6` automatically if `k6` isn't installed).

Run the API in production mode first — `nest start --watch` isn't representative of real throughput:

```bash
npm run -w @workspace/database db:up
npm run -w api build && npm run -w api start &
```

Run with no arguments for the default suite (smoke first as a fail-fast gate, then flash-sale-spike), or name one test to run just that:

```bash
npm run load-test                       # the default suite: smoke -> flash-sale-spike

npm run load-test -- smoke              # 1 VU, 30s — sanity check, safe for CI
npm run load-test -- flash-sale-spike   # thundering herd on a stock-5000 sale: 10s ramp up, 2m sustained, 20s ramp down, 1000 req/s
npm run load-test -- capacity-ramp      # diagnostic only (not in the default suite, ~5.5 min): steps the rate through flat plateaus to find where latency actually breaks
```

`flash-sale-spike` mixes a small pool of repeated emails into an otherwise-unique stream, so the herd produces real same-email collisions (`already_purchased`) under actual network+DB concurrency, not just stock exhaustion. Its target rate (1000 req/s) isn't arbitrary — `capacity-ramp` proved that's the last rate this Postgres pool holds cleanly (p50 ~3ms); the next plateau up, 1250 req/s, breaks hard (p50 ~2.5s). Above that, k6 itself becomes the bottleneck before the API does — its own summary calls this out with a ⚠️ if a run ever hits its VU cap while still dropping iterations, since that means the reported rate describes the load generator, not the system under test. Every knob above is tunable via env vars instead of editing code — `ARRIVAL_RATE`, `RAMP_SECONDS`, `DURATION_SECONDS` (the sustained portion), `EMAIL_REPEAT_SHARE`, `EMAIL_REPEAT_POOL_SIZE` — e.g. `ARRIVAL_RATE=200 RAMP_SECONDS=5 DURATION_SECONDS=10 npm run load-test -- flash-sale-spike` for a quick, low-intensity check.

By default this targets `http://localhost:3000/api` and writes results to `packages/load-test/results/<today's date>/` (e.g. `results/2026-08-28/`) — one directory per day, shared by every test in that day's suite run. Both the target and the results directory name are overridable via env var:

```bash
BASE_URL=http://localhost:4000/api npm run load-test -- smoke   # point at a different running API
RESULTS_LABEL=redis npm run load-test                            # write to results/redis/ instead
```

`RESULTS_LABEL` names a run explicitly instead of dating it — e.g. once caching lands, `RESULTS_LABEL=redis npm run load-test` produces `results/redis/` to diff against a committed baseline.

Each run tags and cleans up its own product/sale/purchases in the dev database (never a truncate) and, after k6 exits, re-checks the correctness invariants (no overselling, no duplicate purchases) directly against Postgres. Results land as JSON + a markdown summary alongside each other in the results directory above; `results/postgres-baseline-0/`, `-1/`, and `-2/` are committed as reference baselines (an unlabeled run never writes into them).
