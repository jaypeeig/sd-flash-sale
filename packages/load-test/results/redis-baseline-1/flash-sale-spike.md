# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 2000/s |
| Achieved rate | 1799.9/s (90% of target) |
| Dropped iterations | 0 (0.00% of offered) |
| VUs used / cap | 2000 / 5000 |

| Metric | Value |
| --- | --- |
| Requests | 269999 |
| Requests/sec | 1799.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 0.5ms |
| Latency p95 | 1.1ms |
| Latency p99 | 5.8ms |
| Latency max | 43.3ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 10.0ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 0.6ms | 1.1ms | 43.3ms |

| Purchase outcome | Count |
| --- | --- |
| success | 5000 |
| already_purchased | 80726 |
| sold_out | 184273 |
