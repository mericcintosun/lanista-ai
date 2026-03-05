import { useState } from 'react';
import { useOracleData } from '../hooks/useOracleData';

// Components
import {
  OracleHeader,
  ContractStats,
  NetworkTelemetry,
  CombatRecordList,
  LootProofModal
} from '../components/oracle';

const ORACLE_CONTRACT = '0xAF470Ae9FE071451E5CC420fb7893326D66c7D12';
const FUJI_EXPLORER = 'https://testnet.snowtrace.io';
const LOOT_CONTRACT = '0x2E078795472996d6FB090A630Dc63f09e3Bda0d1';

export default function Oracle() {
  const { 
    matches, 
    loading, 
    lootDetailsByMatchId, 
    fetchLootDetails 
  } = useOracleData();

  const [copied, setCopied] = useState(false);
  const [lootModalMatchId, setLootModalMatchId] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(ORACLE_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <OracleHeader />

      <ContractStats 
        contractAddress={ORACLE_CONTRACT}
        explorerUrl={FUJI_EXPLORER}
        onChainCount={onChainCount}
        totalCount={totalCount}
        onCopy={handleCopy}
        copied={copied}
      />

      <NetworkTelemetry />

      <CombatRecordList 
        matches={matches}
        loading={loading}
        onOpenLootModal={openLootModal}
      />

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
