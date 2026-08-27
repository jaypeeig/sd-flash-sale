# capacity-ramp



| Load delivered | Value |
| --- | --- |
| Target rate | 2000/s |
| Achieved rate | 747.1/s (37% of target) |
| Dropped iterations | 82771 (28.49% of offered) |
| VUs used / cap | 6000 / 6000 |

> ⚠️ Hit the VU cap with iterations still dropping — the rate above is a load-generator ceiling, not evidence of a system limit. Raise `maxVus` (or lower the target rate) to find the real one.

| Metric | Value |
| --- | --- |
| Requests | 207714 |
| Requests/sec | 747.1 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 4794.2ms |
| Latency p95 | 8074.6ms |
| Latency p99 | 11684.2ms |
| Latency max | 11773.0ms |

| Stage (target rate) | Iterations completed | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| 250/s | 10997 | 2.0ms | 3.0ms | 41.0ms |
| 500/s | 22248 | 2.0ms | 2.0ms | 31.0ms |
| 1000/s | 44495 | 2.0ms | 11.0ms | 97.0ms |
| 1250/s | 36471 | 3194.0ms | 6706.0ms | 9476.0ms |
| 1500/s | 42701 | 6256.0ms | 11679.0ms | 11773.0ms |
| 2000/s | 50802 | 6033.0ms | 8230.0ms | 9006.0ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 17.1ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 3468.0ms | 8074.6ms | 11773.0ms |

| Purchase outcome | Count |
| --- | --- |
| success | 207714 |
