import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';

const MAX_MESSAGES = 100;

export type ArenaChatMessageType = 'normal' | 'highlight' | 'megaphone';

export interface ArenaChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  type: ArenaChatMessageType;
  timestamp: number;
}

const HIGHLIGHT_COST = 50;
const MEGAPHONE_COST = 500;
export const TOMATO_COST = 10;

export type ThrowableTarget = 'player_1' | 'player_2';

export interface ThrowablePayload {
  type: 'throwable';
  item: 'tomato';
  target: ThrowableTarget;
}

async function spendSpark(
  accessToken: string,
  amount: number,
  type: string,
  referenceId: string | null
): Promise<{ ok: boolean; newBalance?: number; error?: string }> {
  const res = await fetch(`${API_URL}/sparks/spend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ amount, type, reference_id: referenceId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || 'Spend failed' };
  }
  return { ok: true, newBalance: data.newBalance };
}

export function useArenaChat(
  matchId: string | null,
  session: { access_token: string; user: { id: string; user_metadata?: { full_name?: string; name?: string; email?: string } } } | null,
  options?: { 
    onThrowable?: (payload: ThrowablePayload) => void;
    onSpend?: (newBalance: number) => void;
  }
) {
  const [messages, setMessages] = useState<ArenaChatMessage[]>([]);
  const [sending, setSending] = useState<'normal' | 'highlight' | 'megaphone' | 'tomato' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onThrowableRef = useRef(options?.onThrowable);
  const onSpendRef = useRef(options?.onSpend);
  onThrowableRef.current = options?.onThrowable;
  onSpendRef.current = options?.onSpend;

  const raw = session?.user?.user_metadata?.full_name
    || session?.user?.user_metadata?.name
    || session?.user?.user_metadata?.email;
  const username = !raw ? 'Anonymous' : raw.includes('@') ? raw.split('@')[0] : raw;

  useEffect(() => {
    if (!matchId) return;

    const channelName = `room-arena-${matchId}`;
    const channel = supabase.channel(channelName, {
      config: { private: true, broadcast: { self: true, ack: true } },
    });

    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      const p = payload as ArenaChatMessage;
      if (p?.id && p?.userId != null && p?.text != null && p?.type && p?.timestamp != null) {
        setMessages((prev) => {
          const next = [...prev, { ...p, username: p.username || 'Anonymous' }];
          return next.slice(-MAX_MESSAGES);
        });
      }
    });

    channel.on('broadcast', { event: 'throwable' }, ({ payload }) => {
      const p = payload as ThrowablePayload;
      if (p?.type === 'throwable' && p?.item === 'tomato' && (p?.target === 'player_1' || p?.target === 'player_2')) {
        onThrowableRef.current?.(p);
      }
    });

    channel.subscribe((status, err) => {
      if (err) setError(err.message);
    });
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const sendPayload = useCallback(
    (text: string, type: ArenaChatMessageType) => {
      const ch = channelRef.current;
      if (!matchId || !session || !ch) return;
      const payload: ArenaChatMessage = {
        id: crypto.randomUUID(),
        userId: session.user.id,
        username,
        text,
        type,
        timestamp: Date.now(),
      };
      ch.send({ type: 'broadcast', event: 'chat', payload });
    },
    [matchId, session, username]
  );

  const sendNormalMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setError(null);
      sendPayload(text.trim(), 'normal');
    },
    [sendPayload]
  );

  const sendHighlightMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !session) return;
      setError(null);
      setSending('highlight');
      try {
        const result = await spendSpark(session.access_token, HIGHLIGHT_COST, 'spend_highlight', matchId || null);
        if (!result.ok) {
          setError(result.error || 'Insufficient Spark');
          return;
        }
        if (result.newBalance !== undefined) onSpendRef.current?.(result.newBalance);
        sendPayload(text.trim(), 'highlight');
      } finally {
        setSending(null);
      }
    },
    [session, matchId, sendPayload]
  );

  const sendMegaphoneMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !session) return;
      setError(null);
      setSending('megaphone');
      try {
        const result = await spendSpark(session.access_token, MEGAPHONE_COST, 'spend_megaphone', matchId || null);
        if (!result.ok) {
          setError(result.error || 'Insufficient Spark');
          return;
        }
        if (result.newBalance !== undefined) onSpendRef.current?.(result.newBalance);
        sendPayload(text.trim(), 'megaphone');
      } finally {
        setSending(null);
      }
    },
    [session, matchId, sendPayload]
  );

  const throwTomato = useCallback(
    async (target: ThrowableTarget) => {
      if (!session || !matchId) return;
      const ch = channelRef.current;
      if (!ch) return;
      setError(null);
      setSending('tomato');
      try {
        const result = await spendSpark(session.access_token, TOMATO_COST, 'spend_tomato', matchId);
        if (!result.ok) {
          setError(result.error || 'Insufficient Spark');
          return;
        }
        if (result.newBalance !== undefined) onSpendRef.current?.(result.newBalance);
        ch.send({
          type: 'broadcast',
          event: 'throwable',
          payload: { type: 'throwable', item: 'tomato', target } as ThrowablePayload,
        });
      } finally {
        setSending(null);
      }
    },
    [session, matchId]
  );

  return {
    messages,
    sendNormalMessage,
    sendHighlightMessage,
    sendMegaphoneMessage,
    throwTomato,
    sending,
    error,
    username,
  };
}
