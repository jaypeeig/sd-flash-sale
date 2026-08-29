# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 800/s |
| Achieved rate | 599.9/s (75% of target) |
| Dropped iterations | 0 (0.00% of offered) |
| VUs used / cap | 800 / 20000 |

| Metric | Value |
| --- | --- |
| Requests | 35999 |
| Requests/sec | 599.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 2.1ms |
| Latency p95 | 3.3ms |
| Latency p99 | 38.5ms |
| Latency max | 233.9ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 13.2ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 2.8ms | 3.3ms | 233.9ms |

| Purchase outcome | Count |
| --- | --- |
| success | 25313 |
| already_purchased | 10685 |
| error | 1 |
