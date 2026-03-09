import { useState } from 'react';
import { useOracleData } from '../hooks/useOracleData';

// Components
import { PageHeader } from '../components/common/PageHeader';
import {
  ContractStats,
  CombatRecordList,
  LootProofModal
} from '../components/oracle';
import { Reveal } from '../components/common/Reveal';

const FUJI_EXPLORER = 'https://testnet.snowtrace.io';
const LOOT_CONTRACT =
  import.meta.env.VITE_RANK_UP_LOOT_NFT_ADDRESS || '0xaE1Aa40228A5eeD0e0D0218f6402C4911b97efd8';

export default function Oracle() {
  const { 
    matches, 
    loading, 
    lootDetailsByMatchId, 
    fetchLootDetails 
  } = useOracleData();

  const [lootModalMatchId, setLootModalMatchId] = useState<string | null>(null);

  const openLootModal = (matchId: string) => {
    setLootModalMatchId(matchId);
    fetchLootDetails(matchId);
  };

  const closeLootModal = () => setLootModalMatchId(null);

  const selectedMatch = lootModalMatchId ? matches.find(m => m.id === lootModalMatchId) : null;
  const selectedLootDetails = lootModalMatchId ? lootDetailsByMatchId[lootModalMatchId] : null;

  const onChainCount = matches.filter(m => m.tx_hash && !m.tx_hash.startsWith('{')).length;
  const totalCount = matches.length;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-16 pb-24 px-6 relative">
      <Reveal>
        <PageHeader 
          title="THE ORACLE" 
          subtitle=""
          description={
            <>
              Log of all combat results. <br />
              Secured on-chain, immutable.
            </>
          }
          actions={
            <div className="flex items-center gap-3 glass bg-white/5 border border-white/10 px-5 py-2 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(0,255,0,0.6)]" />
              <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest font-black">
                Secure
              </span>
            </div>
          }
        />
      </Reveal>

      <Reveal delay={0.2} direction="up" distance={20}>
        <ContractStats 
          onChainCount={onChainCount}
          totalCount={totalCount}
        />
      </Reveal>

      <Reveal delay={0.4}>
        <CombatRecordList 
          matches={matches}
          loading={loading}
          onOpenLootModal={openLootModal}
        />
      </Reveal>

      <LootProofModal 
        lootModalMatchId={lootModalMatchId}
        selectedMatch={selectedMatch || null}
        selectedLootDetails={selectedLootDetails || null}
        onClose={closeLootModal}
        fujiExplorer={FUJI_EXPLORER}
        lootContractAddress={LOOT_CONTRACT}
      />

      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(0); }
          100% { transform: translateY(100px); }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
