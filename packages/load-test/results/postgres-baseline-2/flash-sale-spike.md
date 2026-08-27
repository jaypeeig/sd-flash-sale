# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 4000/s |
| Achieved rate | 2577.5/s (64% of target) |
| Dropped iterations | 153353 (28.40% of offered) |
| VUs used / cap | 5000 / 5000 |

> ⚠️ Hit the VU cap with iterations still dropping — the rate above is a load-generator ceiling, not evidence of a system limit. Raise `maxVus` (or lower the target rate) to find the real one.

| Metric | Value |
| --- | --- |
| Requests | 386646 |
| Requests/sec | 2577.5 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 1743.5ms |
| Latency p95 | 2041.1ms |
| Latency p99 | 2625.0ms |
| Latency max | 3795.5ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 16.3ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 1710.3ms | 2041.1ms | 3795.5ms |

| Purchase outcome | Count |
| --- | --- |
| success | 5000 |
| already_purchased | 2476 |
| sold_out | 379170 |
