/** Redis Lua 脚本必须在 Redis 服务端原子执行，避免 get/del 之间的竞态。 */
export const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export const RENEW_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("expire", KEYS[1], ARGV[2])
end
return 0
`;

export const INCREMENT_WITH_TTL_SCRIPT = `
local value = redis.call("incr", KEYS[1])
if value == 1 or redis.call("ttl", KEYS[1]) < 0 then redis.call("expire", KEYS[1], ARGV[1]) end
return {value, redis.call("ttl", KEYS[1])}
`;

export const THROTTLE_SCRIPT = `
if redis.call("exists", KEYS[2]) == 1 then
  return {tonumber(ARGV[2]) + 1, 0, redis.call("pttl", KEYS[2]), 1}
end
local value = redis.call("incr", KEYS[1])
if value == 1 or redis.call("pttl", KEYS[1]) < 0 then redis.call("pexpire", KEYS[1], ARGV[1]) end
if value > tonumber(ARGV[2]) then
  redis.call("psetex", KEYS[2], ARGV[3], "1")
  redis.call("del", KEYS[1])
  return {value, 0, tonumber(ARGV[3]), 1}
end
return {value, redis.call("pttl", KEYS[1]), 0, 0}
`;
