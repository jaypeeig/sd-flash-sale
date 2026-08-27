# Redis

Commands for synchronizing sale data to Redis.

## Commands

```bash
# Sync a single sale
npm run -w @workspace/redis redis\:sync -- <saleId>

# Sync every active and upcoming sale
npm run -w @workspace/redis redis\:sync -- --all

# Force-sync a single sale, even if it is already live
npm run -w @workspace/redis redis\:sync -- <saleId> --force
```

## Command Reference

| Command    | Description                                                             |
| ---------- | ----------------------------------------------------------------------- |
| `<saleId>` | Synchronizes one specific sale to Redis.                                |
| `--all`    | Synchronizes every sale that is currently active or upcoming.           |
| `--force`  | Forces the sale to be overwritten in Redis, even if it is already live. |

## Usage

### Sync one sale

Use the sale ID when you only need to synchronize a specific sale:

```bash
npm run -w @workspace/redis redis\:sync -- <saleId>
```

Example:

```bash
npm run -w @workspace/redis redis\:sync -- 12345
```

### Sync all active and upcoming sales

Use `--all` to synchronize every sale that hasn't ended yet and still has stock —
covering sales already in progress as well as ones scheduled to start later:

```bash
npm run -w @workspace/redis redis\:sync -- --all
```

Upcoming sales are included on purpose: syncing one ahead of time means it's already
on the Redis fast path the moment it goes live, instead of falling back to Postgres
until someone remembers to sync it by hand. An upcoming sale has no purchases yet, so
it's never considered "live" and syncs without needing `--force`.

This is also useful for refreshing or rebuilding the Redis state for every sale that
matters right now.

### Force-sync a sale

Use `--force` when you need to overwrite a sale that is already live:

```bash
npm run -w @workspace/redis redis\:sync -- <saleId> --force
```

Example:

```bash
npm run -w @workspace/redis redis\:sync -- 12345 --force
```

> **Note:** `--force` bypasses the normal protection around live sale data. Use it only when an intentional overwrite is required.
