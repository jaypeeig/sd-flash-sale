# smoke



| Metric | Value |
| --- | --- |
| Requests | 120 |
| Requests/sec | 3.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 3.9ms |
| Latency p95 | 9.2ms |
| Latency p99 | 9.5ms |
| Latency max | 11.7ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 0.3ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| GET /sales | 3.8ms | 4.5ms | 5.0ms |
| GET /sales/:id | 3.5ms | 4.9ms | 8.1ms |
| POST /sales/:id/purchase | 6.9ms | 9.4ms | 11.7ms |

| Purchase outcome | Count |
| --- | --- |
| success | 30 |
