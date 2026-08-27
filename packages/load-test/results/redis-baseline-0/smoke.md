# smoke



| Metric | Value |
| --- | --- |
| Requests | 120 |
| Requests/sec | 3.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 4.7ms |
| Latency p95 | 10.3ms |
| Latency p99 | 11.0ms |
| Latency max | 23.6ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 0.3ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| GET /sales | 5.3ms | 7.7ms | 23.6ms |
| GET /sales/:id | 4.1ms | 6.9ms | 7.6ms |
| POST /sales/:id/purchase | 7.6ms | 10.8ms | 11.1ms |

| Purchase outcome | Count |
| --- | --- |
| success | 30 |
