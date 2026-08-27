# smoke



| Metric | Value |
| --- | --- |
| Requests | 120 |
| Requests/sec | 3.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 4.4ms |
| Latency p95 | 10.6ms |
| Latency p99 | 11.0ms |
| Latency max | 11.5ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 0.3ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| GET /sales | 4.6ms | 6.3ms | 10.9ms |
| GET /sales/:id | 4.0ms | 6.1ms | 6.9ms |
| POST /sales/:id/purchase | 7.6ms | 11.0ms | 11.5ms |

| Purchase outcome | Count |
| --- | --- |
| success | 30 |
