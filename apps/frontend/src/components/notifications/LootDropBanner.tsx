import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ExternalLink } from 'lucide-react';
import { useLootDropStore, type LootDropNotification } from '../../lib/loot-drop-store';
import { tokenIdToImagePath } from '../../lib/rankUpItems';

const BANNER_DURATION_MS = 8000;

function LootDropBannerInner({ notification, onDismiss }: { notification: LootDropNotification; onDismiss: () => void }) {
  const { botName, rankName, itemName, itemId, botId } = notification;
  const displayText = `${botName} ranked up to ${rankName} and dropped … ${itemName}.`;

  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    const t = setTimeout(onDismiss, BANNER_DURATION_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-0 right-0 z-[90] pointer-events-auto overflow-hidden"
      style={{ top: '5rem' }}
    >
      <div className="relative mx-4 rounded-lg border border-amber-500/50 bg-gradient-to-b from-amber-950/98 to-zinc-950/98 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/10 via-transparent to-amber-400/5 pointer-events-none" aria-hidden />
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-gradient-to-b from-amber-500 via-amber-400 to-amber-600" aria-hidden />
        <div className="flex items-center h-14 sm:h-16">
          <div className="flex items-center gap-3 pl-4 pr-6 shrink-0 border-r border-amber-500/20">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30 overflow-hidden">
              {imgError ? (
                <Gift className="w-5 h-5 text-amber-400" />
              ) : (
                <img
                  src={tokenIdToImagePath(itemId)}
                  alt={itemName}
                  className="w-full h-full object-contain p-1"
                  onError={() => setImgError(true)}
                />
              )}
            </div>
            <div>
              <p className="font-mono text-[9px] text-amber-400/70 uppercase tracking-[0.25em] leading-none">
                Rank-up Loot
              </p>
              <p className="font-mono text-[10px] text-amber-300/90 font-semibold mt-0.5 truncate max-w-[120px]">
                {itemName}
              </p>
            </div>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden py-2 px-2">
            <p className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {displayText}
            </p>
          </div>
          <Link
            to={`/agent/${botId}`}
            className="relative z-10 flex items-center gap-2 shrink-0 px-4 py-2 mr-4 rounded-lg bg-amber-500/20 border border-amber-400/30 hover:bg-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Profil <ExternalLink className="w-3 h-3" />
          </Link>
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-amber-950 to-transparent shrink-0 pointer-events-none" aria-hidden />
        </div>
      </div>
    </motion.div>
  );
}

export function LootDropBanner() {
  const current = useLootDropStore((s) => s.current);
  const dismiss = useLootDropStore((s) => s.dismiss);

  return (
    <AnimatePresence>
      {current && (
        <LootDropBannerInner key={current.id} notification={current} onDismiss={dismiss} />
      )}
    </AnimatePresence>
  );
}
