import type { Match, CombatLog } from '@lanista/types';

/** Convert backend status to what Unity expects */
export function unityStatus(s: string): 'ongoing' | 'finished' {
  return (s === 'finished' || s === 'aborted') ? 'finished' : 'ongoing';
}

/** ─── Safe bridge into the Unity iframe ─────────────────────────────────────── */
export function callUnity(iframe: HTMLIFrameElement | null, fn: string, arg: string | number) {
  try {
    const win = iframe?.contentWindow as unknown as Record<string, unknown>;
    if (typeof win?.[fn] === 'function') {
      (win[fn] as (a: string | number) => void)(arg);
    } else {
      console.warn(`[UnityBridge] fn not found: ${fn}`);
    }
  } catch (e) {
    console.warn('[UnityBridge] bridge error:', e);
  }
}

/**
 * Convert SVG avatar URLs to PNG for Unity texture compatibility.
 */
function urlToPng(url?: string | null): string {
  if (!url) return '';
  // Force Dicebear to return PNG instead of SVG
  if (url.includes('dicebear.com') && url.includes('/svg?')) {
    return url.replace('/svg?', '/png?');
  }
  return url;
}

/**
 * Forward API response to Unity, converting status to Unity format.
 */
export function sendToUnity(
  iframe: HTMLIFrameElement | null,
  data: { match: Match; logs: CombatLog[] },
  statusOverride?: string
) {
  const payload = {
    match: {
      ...data.match,
      status: statusOverride ?? unityStatus(data.match.status),
      // Unity expects p1_current_hp / p2_current_hp at the match root,
      // but the frontend stores them as player_1.current_hp / player_2.current_hp
      p1_current_hp: data.match.player_1?.current_hp ?? data.match.p1_final_stats?.hp ?? 0,
      p2_current_hp: data.match.player_2?.current_hp ?? data.match.p2_final_stats?.hp ?? 0,
    },
    logs: data.logs,
  };

  // Safety Check: For finished matches, always derive winner from HP to avoid
  // stale or mismatched winner_id values sent to Unity.
  if (payload.match.status === 'finished') {
    const p1Hp = payload.match.player_1?.current_hp ?? 0;
    const p2Hp = payload.match.player_2?.current_hp ?? 0;
    if (p1Hp > 0 && p2Hp <= 0) {
      payload.match.winner_id = payload.match.player_1_id ?? payload.match.player_1?.id;
    } else if (p2Hp > 0 && p1Hp <= 0) {
      payload.match.winner_id = payload.match.player_2_id ?? payload.match.player_2?.id;
    } else if (!payload.match.winner_id) {
      payload.match.winner_id = p1Hp >= p2Hp
        ? (payload.match.player_1_id ?? payload.match.player_1?.id)
        : (payload.match.player_2_id ?? payload.match.player_2?.id);
    }
  }

  const json = JSON.stringify(payload);
  console.log(`[UnityBridge] → Unity: status=${payload.match.status} logs=${data.logs.length} winner=${payload.match.winner_id}`);
  
  if (payload.match.winner_id) {
    const winnerName = payload.match.winner_id === payload.match.player_1_id ? payload.match.player_1?.name : payload.match.player_2?.name;
    console.log(`[UnityBridge] Match Winner detected: ${winnerName} (${payload.match.winner_id})`);
  }

  callUnity(iframe, 'LoadJsonGameData', json);

  const avatar1 = urlToPng(data.match.player_1?.avatar_url) || `https://api.dicebear.com/7.x/bottts/png?seed=${data.match.player_1?.name || 'p1'}`;
  const avatar2 = urlToPng(data.match.player_2?.avatar_url) || `https://api.dicebear.com/7.x/bottts/png?seed=${data.match.player_2?.name || 'p2'}`;

  callUnity(iframe, 'LoadPlayer1IconUrl', avatar1);
  callUnity(iframe, 'LoadPlayer2IconUrl', avatar2);
}

/**
 * Set the operation mode of the Unity instance
 * 0 = External API, 1 = iFrame, 2 = Simulation
 */
export function setUnityMode(iframe: HTMLIFrameElement | null, mode: number) {
  console.log(`[UnityBridge] Setting mode: ${mode}`);
  callUnity(iframe, 'SetMode', mode);
}

export function sendThrowableToUnity(
  iframe: HTMLIFrameElement | null,
  payload: { item: string; target?: string }
) {
  // item is currently always 'tomato' which is index 0
  const itemIndex = payload.item === 'tomato' ? 0 : 0;
  
  if (payload.target === 'player_1') {
    callUnity(iframe, 'ThrowObjectToPlayer1', itemIndex);
  } else if (payload.target === 'player_2') {
    callUnity(iframe, 'ThrowObjectToPlayer2', itemIndex);
  } else {
    // fallback or throw to both? let's default to player 1
    callUnity(iframe, 'ThrowObjectToPlayer1', itemIndex);
  }
}
