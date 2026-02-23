import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const WAITING_KEY = 'matchmaking:waiting_agent';

// 1. Lua Script Tanımlaması (Atomic İşlem)
// Bu betik çalışırken Redis tamamen kilitlenir (milisaniyelik bir süre için), 
// böylece iki ajan aynı anda girip birbirini ezemez.
const matchmakerLua = `
  local waiting_agent = redis.call('GET', KEYS[1])
  
  -- Durum 1: Kendisi zaten bekliyorsa
  if waiting_agent == ARGV[1] then
    return nil
    
  -- Durum 2: Havuzda başkası varsa (Eşleşme sağlandı!)
  elseif waiting_agent then
    redis.call('DEL', KEYS[1])
    return waiting_agent
    
  -- Durum 3: Havuz boşsa, kendini ekle ve 60 saniye TTL koy
  else
    redis.call('SETEX', KEYS[1], 60, ARGV[1])
    return nil
  end
`;

// 2. Özel Komutu Redis'e Kaydetme
redis.defineCommand('atomicFindMatch', {
  numberOfKeys: 1,
  lua: matchmakerLua,
});

export const findMatch = async (agentId: string): Promise<string | null> => {
  // 3. Script'i çalıştırıyoruz.
  // KEYS[1] -> WAITING_KEY, ARGV[1] -> agentId
  // TypeScript dinamik komutları tanımadığı için @ts-ignore veya any kullanabiliriz
  const opponentId = await (redis as any).atomicFindMatch(WAITING_KEY, agentId);
  
  return opponentId; // Eşleşme varsa rakibin ID'si döner, yoksa null.
};
