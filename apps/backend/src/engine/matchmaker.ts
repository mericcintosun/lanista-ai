import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Redis Keys
const POOL_KEY = 'matchmaking:pool';
const ENTRY_TIME_KEY = 'matchmaking:entry_times';

/**
 * Advanced Matchmaker Lua Script
 * logic:
 * 1. Find an opponent in the specified ELO range (score) using ZRANGEBYSCORE.
 * 2. If found: Atomically remove opponent from ZSET and cleanup their entry time.
 * 3. Return the opponentId.
 * 4. If not found: Add the searching agent to the pool with their ELO as score.
 */
const eloMatchmakerLua = `
  local pool_key = KEYS[1]
  local entry_time_key = KEYS[2]
  local agent_id = ARGV[1]
  local agent_elo = tonumber(ARGV[2])
  local range = tonumber(ARGV[3])
  local current_time = ARGV[4]

  -- Try to find an opponent within [agent_elo - range, agent_elo + range]
  -- excluding the agent themselves
  local min_score = agent_elo - range
  local max_score = agent_elo + range
  
  local opponents = redis.call('ZRANGEBYSCORE', pool_key, min_score, max_score)
  
  for _, opponent_id in ipairs(opponents) do
    if opponent_id ~= agent_id then
      -- Match found! Remove opponent from pool and cleanup
      redis.call('ZREM', pool_key, opponent_id)
      redis.call('HDEL', entry_time_key, opponent_id)
      return opponent_id
    end
  end

  -- No match found or only found self: 
  -- Add/Update self in the pool and track entry time if not already there
  redis.call('ZADD', pool_key, agent_elo, agent_id)
  
  local already_exists = redis.call('HEXISTS', entry_time_key, agent_id)
  if already_exists == 0 then
    redis.call('HSET', entry_time_key, agent_id, current_time)
  end
  
  return nil
`;

// Register the custom atomic command
redis.defineCommand('findEloMatch', {
  numberOfKeys: 2,
  lua: eloMatchmakerLua,
});

/**
 * findMatch: Finds a fair opponent based on ELO.
 * Supports expanding search range if the agent has been waiting.
 */
export const findMatch = async (agentId: string, agentElo: number, agentName?: string): Promise<string | null> => {
  const now = Math.floor(Date.now() / 1000);

  // 1. Calculate how long this agent has been waiting (if previously queued)
  const entryTime = await redis.hget(ENTRY_TIME_KEY, agentId);
  const waitTime = entryTime ? now - parseInt(entryTime) : 0;

  const elo = agentElo || 1200;
  // Standard: +/- 100 ELO
  // After 30s: +/- 9999 ELO (Essentially match with ANYONE in the pool to prevent deadlock)
  const searchRange = waitTime > 30 ? 9999 : 100;

  const displayName = agentName || agentId;
  console.log(`🔍 [Matchmaker] ${displayName} (${elo}) searching in range [${elo - searchRange}, ${elo + searchRange}] (Waiting: ${waitTime}s)`);

  // 3. Execute atomic matchmaking script
  const opponentId = await (redis as any).findEloMatch(
    POOL_KEY,
    ENTRY_TIME_KEY,
    agentId,
    elo,
    searchRange,
    now
  );

  if (opponentId) {
    console.log(`✅ [Matchmaker] Match Found! ${displayName} (${elo}) vs ${opponentId} (Range: +/- ${searchRange})`);
    // Cleanup searching agent data from Redis pool since they've matched
    await redis.hdel(ENTRY_TIME_KEY, agentId);
    await redis.zrem(POOL_KEY, agentId);
  } else {
    // If no match was found, the searching agent was added to the pool by the script
    console.log(`⏳ [Matchmaker] No immediate match for ${displayName}. Added to pool.`);
  }

  return opponentId;
};
