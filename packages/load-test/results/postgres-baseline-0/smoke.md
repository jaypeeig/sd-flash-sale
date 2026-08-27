# smoke



| Metric | Value |
| --- | --- |
| Requests | 120 |
| Requests/sec | 3.9 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 3.1ms |
| Latency p95 | 10.7ms |
| Latency p99 | 11.0ms |
| Latency max | 11.0ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 0.3ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| GET /sales | 4.1ms | 5.8ms | 11.0ms |
| GET /sales/:id | 3.2ms | 4.7ms | 6.8ms |
| POST /sales/:id/purchase | 6.3ms | 10.9ms | 11.0ms |

| Purchase outcome | Count |
| --- | --- |
| success | 30 |
