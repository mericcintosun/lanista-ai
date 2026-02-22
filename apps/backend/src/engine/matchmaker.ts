import Redis from 'ioredis';

// Mevcut Redis bağlantısını kullan
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const WAITING_KEY = 'matchmaking:waiting_agent';

export const findMatch = async (agentId: string): Promise<string | null> => {
  // 1. Önce halihazırda bekleyen biri var mı diye bak
  const waitingAgentId = await redis.get(WAITING_KEY);

  // 2. Eğer bekleyen yoksa, kendini ekle (60 saniye sonra silinsin - TTL)
  if (!waitingAgentId) {
    await redis.set(WAITING_KEY, agentId, 'EX', 60);
    return null;
  }

  // 3. Eğer bekleyen kişi kendisi ise, bir şey yapma
  if (waitingAgentId === agentId) {
    return null;
  }

  // 4. Eğer bekleyen başkasıysa, onu havuzdan çıkar (Atomic DEL)
  // Bu noktada başka bir instance aynı anda bu oyuncuyu almış olabilir, 
  // bu yüzden silme işleminin sonucunu kontrol ediyoruz.
  const deleted = await redis.del(WAITING_KEY);
  
  if (deleted === 1) {
    return waitingAgentId; // Eşleşme başarılı!
  }

  // Eğer silme başarısızsa (başka bir process kaptıysa), kendini ekle
  await redis.set(WAITING_KEY, agentId, 'EX', 60);
  return null;
};
