# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 4000/s |
| Achieved rate | 3599.9/s (90% of target) |
| Dropped iterations | 0 (0.00% of offered) |
| VUs used / cap | 4000 / 5000 |

| Metric | Value |
| --- | --- |
| Requests | 539999 |
| Requests/sec | 3599.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 0.3ms |
| Latency p95 | 9.3ms |
| Latency p99 | 69.2ms |
| Latency max | 5306.7ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 9.2ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 15.8ms | 9.3ms | 5306.7ms |

| Purchase outcome | Count |
| --- | --- |
| success | 5000 |
| already_purchased | 161744 |
| sold_out | 373255 |
