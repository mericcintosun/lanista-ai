import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ExternalLink, X } from 'lucide-react';
import { useLootDropStore, type LootDropNotification } from '../../lib/loot-drop-store';
import { tokenIdToImagePath } from '../../lib/rankUpItems';

const BANNER_DURATION_MS = 8000;

function LootDropBannerInner({
  notification,
  queueLength,
  onDismiss,
}: {
  notification: LootDropNotification;
  queueLength: number;
  onDismiss: () => void;
}) {
  const { botName, rankName, itemName, itemId, botId } = notification;
  const [imgError, setImgError] = useState(false);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss timer + progress bar
  useEffect(() => {
    setProgress(100);
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / BANNER_DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(tick);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(tick);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-1/2 -translate-x-1/2 z-[90] pointer-events-auto w-[92%] max-w-md"
      style={{ top: '5.5rem' }}
    >
      <div className="relative rounded-xl border border-amber-500/50 bg-gradient-to-b from-amber-950/98 to-zinc-950/98 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_0_1px_rgba(251,191,36,0.1)] backdrop-blur-xl overflow-hidden">
        {/* Decorative left bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600" aria-hidden />

        {/* Content */}
        <div className="flex items-center gap-3 pl-4 pr-3 py-3">
          {/* Item image */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/30 overflow-hidden shrink-0">
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

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] text-amber-400/70 uppercase tracking-[0.2em] leading-none mb-1">
              Rank-up Loot Drop
            </p>
            <p className="text-sm font-bold text-white leading-snug">
              <span className="text-amber-300">{botName}</span>
              <span className="text-zinc-300 font-normal"> ranked up to </span>
              <span className="text-amber-400">{rankName}</span>
            </p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              Dropped: <span className="text-amber-200 font-medium">{itemName}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to={`/agent/${botId}`}
              onClick={onDismiss}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] uppercase tracking-wider transition-colors"
            >
              View <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Queue badge */}
        {queueLength > 0 && (
          <div className="absolute top-2 right-10 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            +{queueLength}
          </div>
        )}

        {/* Progress bar */}
        <div className="h-0.5 bg-zinc-800">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function LootDropBanner() {
  const current = useLootDropStore((s) => s.current);
  const queue = useLootDropStore((s) => s.queue);
  const dismiss = useLootDropStore((s) => s.dismiss);

  return (
    <AnimatePresence mode="wait">
      {current && (
        <LootDropBannerInner
          key={current.id}
          notification={current}
          queueLength={queue.length}
          onDismiss={dismiss}
        />
      )}
    </AnimatePresence>
  );
}
