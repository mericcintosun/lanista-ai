import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { useSparkStore } from '../lib/spark-store';

const COOLDOWN_SEC = 120; // matches backend WATCH_REWARD_COOLDOWN_SEC
const STORAGE_KEY = 'lanista_watch_reward_next_at'; // epoch ms when next claim is allowed

function getStoredNextAt(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function setStoredNextAt(nextAt: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(nextAt));
  } catch {}
}

export interface UseWatchRewardReturn {
  secondsLeft: number;    // 0 = claimable
  canClaim: boolean;
  claiming: boolean;
  lastAmount: number;     // Sparks from last successful claim
  claim: () => Promise<void>;
}

export function useWatchReward(): UseWatchRewardReturn {
  const session = useAuthStore((s) => s.session);
  const setBalance = useSparkStore((s) => s.setBalance);

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const nextAt = getStoredNextAt();
    return Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
  });
  const [claiming, setClaiming] = useState(false);
  const [lastAmount, setLastAmount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the countdown every second
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const nextAt = getStoredNextAt();
      const left = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
      setSecondsLeft(left);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const claim = useCallback(async () => {
    if (!session?.access_token || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`${API_URL}/sparks/claim-watch-reward`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const nextAt = Date.now() + COOLDOWN_SEC * 1000;
        setStoredNextAt(nextAt);
        setSecondsLeft(COOLDOWN_SEC);
        setLastAmount(data.amount ?? 10);
        if (typeof data.newBalance === 'number') setBalance(data.newBalance);
      } else if (res.status === 429 && typeof data.retryAfterSeconds === 'number') {
        // Sync with server-side cooldown
        const nextAt = Date.now() + data.retryAfterSeconds * 1000;
        setStoredNextAt(nextAt);
        setSecondsLeft(data.retryAfterSeconds);
      }
    } catch {
      // network error — silently ignore
    } finally {
      setClaiming(false);
    }
  }, [session?.access_token, claiming, setBalance]);

  // Auto-claim once on mount if no cooldown stored
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current || !session?.access_token) return;
    mountedRef.current = true;
    const nextAt = getStoredNextAt();
    if (Date.now() >= nextAt) {
      claim();
    }
  }, [session?.access_token, claim]);

  return {
    secondsLeft,
    canClaim: secondsLeft === 0,
    claiming,
    lastAmount,
    claim,
  };
}
