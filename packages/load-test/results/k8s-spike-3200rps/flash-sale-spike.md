# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 3200/s |
| Achieved rate | 129.1/s (4% of target) |
| Dropped iterations | 102794 (81.83% of offered) |
| VUs used / cap | 16868 / 20000 |

| Metric | Value |
| --- | --- |
| Requests | 34172 |
| Requests/sec | 129.1 |
| Failed requests | 34.75% |
| Checks passed | 97.88% |
| Latency p50 | 4853.8ms |
| Latency p95 | 220157.4ms |
| Latency p99 | 222330.2ms |
| Latency max | 233893.4ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 3.2ms |
| p95 | 12.2ms |
| max | 6031.4ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 4428.5ms | 20227.7ms | 226200.3ms |

| Purchase outcome | Count |
| --- | --- |
| success | 10975 |
| already_purchased | 11322 |
| error | 482 |
