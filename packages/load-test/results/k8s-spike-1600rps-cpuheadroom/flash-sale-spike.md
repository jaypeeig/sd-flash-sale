# flash-sale-spike



| Load delivered | Value |
| --- | --- |
| Target rate | 1600/s |
| Achieved rate | 832.9/s (52% of target) |
| Dropped iterations | 14496 (20.13% of offered) |
| VUs used / cap | 10484 / 20000 |

| Metric | Value |
| --- | --- |
| Requests | 57503 |
| Requests/sec | 832.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 6022.3ms |
| Latency p95 | 15945.8ms |
| Latency p99 | 16098.6ms |
| Latency max | 16302.2ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.2ms |
| max | 18.1ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| POST /sales/:id/purchase | 6672.8ms | 15945.8ms | 16302.2ms |

| Purchase outcome | Count |
| --- | --- |
| success | 40523 |
| already_purchased | 16980 |
