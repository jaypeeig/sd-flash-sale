# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 1600/s |
| Achieved rate | 767.5/s (48% of target) |
| Dropped iterations | 18974 (26.35% of offered) |
| VUs used / cap | 12114 / 20000 |

| Metric | Value |
| --- | --- |
| Requests | 53025 |
| Requests/sec | 767.5 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 8023.7ms |
| Latency p95 | 17026.1ms |
| Latency p99 | 17246.4ms |
| Latency max | 17443.2ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.2ms |
| max | 18.2ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 8091.6ms | 17026.1ms | 17443.2ms |

| Purchase outcome | Count |
| --- | --- |
| success | 37307 |
| already_purchased | 15718 |
