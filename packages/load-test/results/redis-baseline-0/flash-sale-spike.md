# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 1250/s |
| Achieved rate | 1125.0/s (90% of target) |
| Dropped iterations | 0 (0.00% of offered) |
| VUs used / cap | 1250 / 5000 |

| Metric | Value |
| --- | --- |
| Requests | 168749 |
| Requests/sec | 1125.0 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 0.4ms |
| Latency p95 | 0.9ms |
| Latency p99 | 4.2ms |
| Latency max | 105.1ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 13.6ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 0.5ms | 0.9ms | 105.1ms |

| Purchase outcome | Count |
| --- | --- |
| success | 5000 |
| already_purchased | 50551 |
| sold_out | 113198 |
