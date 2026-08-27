# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 2000/s |
| Achieved rate | 1800.0/s (90% of target) |
| Dropped iterations | 0 (0.00% of offered) |
| VUs used / cap | 2000 / 5000 |

| Metric | Value |
| --- | --- |
| Requests | 269999 |
| Requests/sec | 1800.0 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 0.7ms |
| Latency p95 | 6.9ms |
| Latency p99 | 185.4ms |
| Latency max | 658.8ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 16.7ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 6.4ms | 6.9ms | 658.8ms |

| Purchase outcome | Count |
| --- | --- |
| success | 5000 |
| already_purchased | 2028 |
| sold_out | 262971 |
