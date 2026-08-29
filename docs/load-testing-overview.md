# The load testing overview

Three iterations, one question: what happens to a flash sale when everyone
shows up at once? Here's what we found, in the order we found it.

**The short version:** the original design was correct but not fast enough
past ~1250 req/s. Throwing more CPU at Postgres barely moved the needle. The
actual fix was architectural - stop writing to Postgres on the request path
at all.

---

## Iteration 1: the architecture we started with

```
POST /purchase
   |
   v
Redis (Lua script)  --> sold_out / already_purchased / sale_not_active --> respond
   |
   | "reserved" (stock already decremented in Redis)
   v
Postgres transaction (insert + decrement)  --> respond
```

The idea: Redis is a single atomic gate. One Lua script checks the sale
window, checks if you've already bought one, checks stock, and - if you win -
decrements the counter and adds you to the buyers set, all in one round trip.
Only a genuine winner ever touches Postgres. Everyone else (the vast
majority, once a sale is popular) gets rejected in microseconds without the
database knowing they existed.

That's the good part, and it worked exactly as designed in every test. The
problem was the other half: **the winner's write was still synchronous and
in the request path.** Every successful purchase was one full Postgres
transaction - insert a row, lock the sale row, decrement it, commit - before
the HTTP response went out. Fine at low volume. Not fine once purchases
start arriving faster than Postgres can commit one-row transactions.

## Running it: the honest baseline (800 / 1600 / 3200 req/s)

Same cluster, same app, three arrival rates. This is the architecture above,
un-tuned - Postgres and Redis both running on modest CPU requests (100m /
50m) with no headroom.

| Target rate | Achieved | Dropped | p50 | p95 | p99 |
| --- | --- | --- | --- | --- | --- |
| 800/s | 599.9/s (75%) | 0% | 2.1ms | 3.3ms | 38.5ms |
| 1600/s | 767.5/s (48%) | 26.4% | 8,023.7ms | 17,026.1ms | 17,246.4ms |
| 3200/s | 129.1/s (4%) | 81.8% | 4,853.8ms | 220,157.4ms | 222,330.2ms |

800 req/s: no problem. Sub-4ms across the board.

1600 req/s: the wheels come off. p95 jumps from milliseconds to **17
seconds**, and a quarter of all iterations get dropped because k6 itself
can't keep enough requests in flight against a server this slow.

3200 req/s: not degraded, *broken*. p95 over three and a half minutes,
82% of iterations dropped, a third of requests failing outright. This run
also knocked over pods - kubelet started killing api, web, postgres, and
redis for missing liveness probes, because the whole machine (kind + docker
+ k6 all fighting for the same cores) was starving under the load.

**Note on that last point:** the pod restarts at 3200 req/s were a confound
- partly real backpressure, partly this all running on one dev machine. But
the *shape* of the curve (fine at 800, falling apart by 1600) held up
independent of that, and it's consistent with a very specific bottleneck:
every successful purchase serializes on the same row lock (`sales.remaining_stock`
for the one active sale). More concurrent winners just means more
transactions queued up waiting for that same row.

## Iteration 2: a theory - "maybe it just needs more CPU"

Reasonable next guess: Postgres and Redis were running on CPU *requests* of
100m and 50m respectively - barely a scheduling priority, no real headroom
under contention. Bumped them to 1000m and 500m and reran 1600 req/s, the
run that fell apart worst without a total collapse, as the comparison point.

| | Achieved | Dropped | p95 |
| --- | --- | --- | --- |
| Before (100m / 50m) | 767.5/s (48%) | 26.4% | 17,026.1ms |
| After (1000m / 500m) | 832.9/s (52%) | 20.1% | 15,945.8ms |

Better, technically. Also nowhere close to fixed. A 10x CPU bump bought
about a 6% throughput improvement and knocked p95 down by one second - still
measured in *seconds*, still dropping a fifth of the traffic.

**This is the useful negative result.** If the problem were Postgres
starving for CPU cycles, more CPU would have fixed it. It didn't, which
means the bottleneck wasn't resource scarcity - it was serialization. Ten
times more CPU doesn't help if the work is still one transaction at a time,
each one waiting on the same row lock as the last. The theory was wrong, and
the data said so cleanly.

## Iteration 3: the actual fix - stop writing inline

The insight: by the time a purchase reaches Postgres, Redis has *already*
made every decision that matters. The stock is already decremented, the
buyer is already recorded, the window is already validated - all in Redis,
atomically, in one Lua script. Postgres doesn't need to be in the response
path at all. It just needs to end up with the same data eventually.

So: a `"reserved"` outcome now gets published to RabbitMQ instead of written
straight to Postgres, and the API responds immediately. A separate worker
drains the queue in batches - one transaction per ~200 messages instead of
one per purchase - and writes to Postgres at whatever rate Postgres can
actually sustain, decoupled from how fast requests are arriving.

```
POST /purchase
   |
   v
Redis (Lua script)  --> sold_out / already_purchased / sale_not_active --> respond
   |
   | "reserved"
   v
RabbitMQ  ---> respond immediately
   |
   v
worker (batches of ~200)  --> Postgres
```

If the broker itself is unreachable, it falls back to the old synchronous
write rather than losing the purchase - degrade, don't drop.

Reran 1600 and 3200 req/s against this:

| Target rate | Iteration | Achieved | Dropped | p95 | p99 |
| --- | --- | --- | --- | --- | --- |
| 1600/s | baseline | 767.5/s (48%) | 26.4% | 17,026.1ms | 17,246.4ms |
| 1600/s | + CPU headroom | 832.9/s (52%) | 20.1% | 15,945.8ms | 16,098.6ms |
| 1600/s | **+ queue** | **1,199.8/s (75%)** | **0%** | **3.9ms** | **12.3ms** |
| 3200/s | baseline | 129.1/s (4%) | 81.8% | 220,157.4ms | 222,330.2ms |
| 3200/s | **+ queue** | **2,399.8/s (75%)** | **0%** | **22.6ms** | **76.7ms** |

At 1600 req/s: p95 goes from 17 seconds to **3.9 milliseconds** - roughly a
4,300x improvement - and every single iteration completes instead of a
quarter being dropped.

At 3200 req/s: p95 goes from 220 **seconds** to 22.6 **milliseconds** -
about a 9,700x improvement - and this run caused zero pod restarts, versus
four different pods getting killed under the same load before.

Both runs held 75% of target rate, which is a k6 VU-scheduling ceiling in
this test's configuration, not a system limit - the API itself never showed
signs of strain at either rate with the queue in place.

## Correctness, the whole way through

This is the part worth saying explicitly: **every single run, across all
three iterations, held every invariant.** No overselling. No duplicate
purchases. `total_stock - remaining_stock` matched the purchase count
exactly, every time - including the runs where p95 latency was measured in
minutes. Redis's atomic gate was doing its job correctly the entire time;
the only thing that ever broke was *speed*, never *correctness*. The queue
didn't fix a bug - it fixed a bottleneck.

(One near-exception: a race condition was found at extreme load during
early testing, but it was in the *test harness's own verification script*
- a non-atomic two-query read racing against a still-draining queue, not
in the application. Fixed by wrapping both reads in one transaction. Worth
mentioning because it's a good reminder to distrust your measurement tool
before you distrust your system.)

## Takeaways

- **A synchronous write-per-request architecture has a cliff, not a slope.**
  This system was fine at 800 req/s and on fire at 1600 - there's no gentle
  degradation in between, because everything funnels through one row lock.
- **CPU headroom is not a substitute for architecture.** A 10x resource
  increase produced a single-digit-percent improvement. If your bottleneck
  is serialization, you can't buy your way out with more cores.
- **Move the write off the request path, not just "make it faster."** The
  queue didn't optimize the Postgres transaction - it removed it from
  the thing the client is waiting on. Response time became a function of
  Redis's one Lua round trip, full stop.
- **Batching is where the throughput actually came from.** One transaction
  per 200 purchases instead of one per purchase is what let the same
  Postgres instance, on the same hardware, absorb over 100k purchases in
  a minute instead of falling over at 1600 req/s.
- **Fail open, not closed.** The queue path still checks itself - a broker
  that's unreachable falls back to the old synchronous write rather than
  silently losing a sale. Speed is the optimization; correctness was never
  up for negotiation.
