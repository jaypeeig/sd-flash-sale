-- KEYS[1] stock  KEYS[2] meta  KEYS[3] buyers
-- ARGV[1] normalized email  ARGV[2] now (ms epoch, as a string)
--
-- One round trip answers every rejection the purchase endpoint can give
-- without ever touching Postgres. Only 'reserved' writes through.

if redis.call('EXISTS', KEYS[1]) == 0 or redis.call('EXISTS', KEYS[2]) == 0 then
  return 'not_warmed'
end
if redis.call('HGET', KEYS[2], 'cancelled') == '1' then
  return 'sale_not_active'
end

local startsAt = tonumber(redis.call('HGET', KEYS[2], 'startsAt'))
local endsAt = tonumber(redis.call('HGET', KEYS[2], 'endsAt'))
local now = tonumber(ARGV[2])
if startsAt == nil or endsAt == nil or now == nil or now < startsAt or now >= endsAt then
  return 'sale_not_active'
end

if redis.call('SISMEMBER', KEYS[3], ARGV[1]) == 1 then
  return 'already_purchased'
end

local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil or stock <= 0 then
  return 'sold_out'
end

redis.call('DECR', KEYS[1])
redis.call('SADD', KEYS[3], ARGV[1])
return 'reserved'
