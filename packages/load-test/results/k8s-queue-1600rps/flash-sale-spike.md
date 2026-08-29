# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 1600/s |
| Achieved rate | 1199.8/s (75% of target) |
| Dropped iterations | 0 (0.00% of offered) |
| VUs used / cap | 1600 / 20000 |

| Metric | Value |
| --- | --- |
| Requests | 71999 |
| Requests/sec | 1199.8 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 0.9ms |
| Latency p95 | 3.9ms |
| Latency p99 | 12.3ms |
| Latency max | 81.3ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 18.6ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 1.5ms | 3.9ms | 81.3ms |

| Purchase outcome | Count |
| --- | --- |
| success | 50244 |
| already_purchased | 21754 |
| error | 1 |
