# Local Kubernetes deploy (kind)

## Topology

```mermaid
flowchart TD
    Browser["browser<br/>http://localhost:8080"] --> Ingress["ingress-nginx"]
    Ingress -->|"/api, /docs"| ApiSvc["api Service"]
    Ingress -->|"/"| Web["web (1 replica)<br/>nginx, static SPA"]
    ApiSvc -->|"L7 round-robin<br/>across endpoints"| Api1["api pod 1"]
    ApiSvc --> Api2["api pod 2"]
    Api1 --> Postgres["postgres (StatefulSet)"]
    Api1 --> Redis["redis (StatefulSet)"]
    Api1 -->|"publish"| Rabbitmq["rabbitmq (StatefulSet)"]
    Api2 --> Postgres
    Api2 --> Redis
    Api2 -->|"publish"| Rabbitmq
    Rabbitmq -->|"drain, batched"| Worker["worker (1 replica)"]
    Worker --> Postgres
```

The SPA is built with `VITE_API_URL=/api` (same-origin) - `web` serves
static files only, the Ingress routes `/api`/`/docs` straight to `api`.

A Redis-confirmed purchase is handed to RabbitMQ instead of written to
Postgres inline - `api` responds immediately, and `worker` drains the queue
into Postgres in batches. `worker` has no HTTP surface, so it has no
liveness/readiness probes - a broker or Postgres it can't reach makes it
crash on boot, and Kubernetes' restart policy is the retry.

## Quick start

```bash
k8s/scripts/setup.sh           # cluster-up → build-images → deploy → seed, prints endpoints
```

Needs Docker, [`kind`](https://kind.sigs.k8s.io/docs/user/quick-start/#installation),
[`kubectl`](https://kubernetes.io/docs/tasks/tools/#kubectl), and
[`kubeconform`](https://github.com/yannh/kubeconform#installation) - all four
get installed automatically by the root `npm install` (see
[../scripts/check-deps.sh](../scripts/check-deps.sh)), or on demand with
`npm run setup:deps` from the repo root. `cluster-up.sh` and `validate.sh`
still check for their tools directly and point at that command if anything's
missing. No Helm.

Then open **http://localhost:8080/** (docs at **http://localhost:8080/docs**).

## Scripts

| script                | what it does                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `setup.sh [--yes]`    | runs all four steps below in order, then prints the Ingress/Service/Endpoints and app URLs                                   |
| `cluster-up.sh`       | create the `flash-sale` kind cluster (if it doesn't exist) + install ingress-nginx                                           |
| `build-images.sh`     | build the `api`/`web`/`ops`/`worker` images from their own `docker/*.Dockerfile`, `kind load` them                           |
| `validate.sh`         | validate every manifest against the Kubernetes API schema via `kubeconform` (not a style linter - oxlint doesn't cover YAML) |
| `deploy.sh`           | apply `overlays/local`, wait for postgres/redis/rabbitmq, run migrations to completion, roll out api + worker + web          |
| `seed.sh [--yes]`     | **destructive** - truncates and re-seeds Postgres, then warms Redis. Never run by `deploy.sh`.                               |
| `warm.sh`             | non-destructive - re-warms Redis from Postgres only (e.g. after a Redis pod restart)                                         |
| `load-test.sh [args]` | runs `packages/load-test`'s k6 suite against the cluster (port-forwards postgres/redis/rabbitmq, targets the Ingress)        |
| `down.sh [--cluster]` | delete the `flash-sale` namespace (app + PVCs); `--cluster` also deletes the kind cluster                                    |
