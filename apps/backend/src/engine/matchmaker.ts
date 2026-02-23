import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const WAITING_KEY = 'matchmaking:waiting_agent';

// 1. Lua Script Definition (Atomic Operation)
// While this script runs, Redis is fully locked (for a few milliseconds),
// preventing two agents from racing and overwriting each other.
const matchmakerLua = `
  local waiting_agent = redis.call('GET', KEYS[1])
  
  -- Case 1: Agent is already waiting (self-match prevention)
  if waiting_agent == ARGV[1] then
    return nil
    
  -- Case 2: Someone else is in the pool (Match found!)
  elseif waiting_agent then
    redis.call('DEL', KEYS[1])
    return waiting_agent
    
  -- Case 3: Pool is empty — add self with 60 second TTL
  else
    redis.call('SETEX', KEYS[1], 60, ARGV[1])
    return nil
  end
`;

// 2. Register the custom command in Redis
redis.defineCommand('atomicFindMatch', {
  numberOfKeys: 1,
  lua: matchmakerLua,
});

export const findMatch = async (agentId: string): Promise<string | null> => {
  // 3. Execute the atomic matchmaking script
  // KEYS[1] -> WAITING_KEY, ARGV[1] -> agentId
  // TypeScript doesn't recognize dynamic commands, so we cast to any
  const opponentId = await (redis as any).atomicFindMatch(WAITING_KEY, agentId);

  return opponentId; // Returns opponent's ID if matched, null otherwise.
};
