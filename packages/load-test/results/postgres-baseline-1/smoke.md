# smoke



| Metric | Value |
| --- | --- |
| Requests | 8 |
| Requests/sec | 4.8 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 3.7ms |
| Latency p95 | 9.1ms |
| Latency p99 | 9.3ms |
| Latency max | 9.3ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.2ms |
| max | 0.3ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| GET /sales | 6.6ms | 8.5ms | 8.7ms |
| GET /sales/:id | 2.5ms | 3.7ms | 3.8ms |
| POST /sales/:id/purchase | 6.5ms | 9.1ms | 9.3ms |

| Purchase outcome | Count |
| --- | --- |
| success | 2 |
