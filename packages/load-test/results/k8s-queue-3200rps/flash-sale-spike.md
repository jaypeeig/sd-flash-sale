# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 3200/s |
| Achieved rate | 2399.8/s (75% of target) |
| Dropped iterations | 0 (0.00% of offered) |
| VUs used / cap | 3200 / 20000 |

| Metric | Value |
| --- | --- |
| Requests | 143999 |
| Requests/sec | 2399.8 |
| Failed requests | 0.01% |
| Checks passed | 99.99% |
| Latency p50 | 1.1ms |
| Latency p95 | 22.6ms |
| Latency p99 | 76.7ms |
| Latency max | 978.1ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 12.4ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 6.6ms | 22.6ms | 978.1ms |

| Purchase outcome | Count |
| --- | --- |
| success | 101040 |
| already_purchased | 42945 |
| error | 14 |
