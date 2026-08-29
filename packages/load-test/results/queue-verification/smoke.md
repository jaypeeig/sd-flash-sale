# smoke



| Metric | Value |
| --- | --- |
| Requests | 120 |
| Requests/sec | 4.0 |
| Failed requests | 0.00% |
| Checks passed | 100.00% |
| Latency p50 | 2.0ms |
| Latency p95 | 7.4ms |
| Latency p99 | 10.1ms |
| Latency max | 11.2ms |

| Connection overhead (http_req_blocked) | Value |
| --- | --- |
| avg | 0.0ms |
| p95 | 0.0ms |
| max | 1.6ms |

| Endpoint | avg | p95 | max |
| --- | --- | --- | --- |
| GET /sales | 3.7ms | 8.9ms | 11.2ms |
| GET /sales/:id | 3.1ms | 7.5ms | 10.4ms |
| POST /sales/:id/purchase | 2.0ms | 3.7ms | 5.4ms |

| Purchase outcome | Count |
| --- | --- |
| success | 30 |
