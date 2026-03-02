import 'dotenv/config';
import { config } from 'dotenv';
config({ path: './apps/backend/.env.local' });

import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LOOT_ABI = [
  'function getLoot(string matchId) external view returns (bool fulfilled, address winner, uint256 itemId, uint256 randomness, uint256 timestamp, uint256 requestId)'
];

const provider = new ethers.JsonRpcProvider(process.env.AVALANCHE_RPC_URL);
const contract = new ethers.Contract(process.env.LOOT_CHEST_CONTRACT_ADDRESS!, LOOT_ABI, provider);

async function main() {
  // tx_hash olan ama loot DB'ye yazılmamış tüm maçları çek
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'finished')
    .not('tx_hash', 'is', null)
    .is('winner_loot_item_id', null);

  if (error) throw error;
  console.log(`📋 ${matches?.length || 0} maç pending loot için kontrol edilecek.\n`);

  let synced = 0;
  let notReady = 0;
  let errors = 0;

  for (const match of matches || []) {
    try {
      const r = await contract.getLoot(match.id);
      const fulfilled = Boolean(r[0]);
      const itemId = Number(r[2]);

      if (fulfilled && itemId > 0) {
        await supabase
          .from('matches')
          .update({ winner_loot_item_id: itemId })
          .eq('id', match.id);
        console.log(`✅ ${match.id.slice(0, 8)} → Item #${itemId}`);
        synced++;
      } else {
        console.log(`⏳ ${match.id.slice(0, 8)} → VRF henüz fulfill olmadı`);
        notReady++;
      }
      // RPC throttle için kısa bekleme
      await new Promise(r => setTimeout(r, 200));
    } catch (e: any) {
      console.error(`❌ ${match.id.slice(0, 8)} → ${e.message}`);
      errors++;
    }
  }

  console.log(`\n🏁 Tamamlandı: ${synced} yazıldı | ${notReady} henüz hazır değil | ${errors} hata`);
}

main().catch(console.error);
