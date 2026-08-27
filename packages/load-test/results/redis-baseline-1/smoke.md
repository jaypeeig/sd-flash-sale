# smoke



| Metric | Value |
| --- | --- |
| Requests | 120 |
| Requests/sec | 3.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 4.5ms |
| Latency p95 | 9.7ms |
| Latency p99 | 10.4ms |
| Latency max | 10.6ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 0.3ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| GET /sales | 4.8ms | 6.1ms | 10.3ms |
| GET /sales/:id | 3.8ms | 5.8ms | 6.8ms |
| POST /sales/:id/purchase | 6.6ms | 10.2ms | 10.6ms |

| Purchase outcome | Count |
| --- | --- |
| success | 30 |
