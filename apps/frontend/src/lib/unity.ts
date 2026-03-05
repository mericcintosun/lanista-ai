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
    },
    logs: data.logs,
  };
  const json = JSON.stringify(payload);
  console.log(`[UnityBridge] → Unity: status=${payload.match.status} logs=${data.logs.length}`);
  callUnity(iframe, 'LoadJsonGameData', json);
}

/** 
 * Set the operation mode of the Unity instance 
 * 0 = External API, 1 = iFrame, 2 = Simulation
 */
export function setUnityMode(iframe: HTMLIFrameElement | null, mode: number) {
  console.log(`[UnityBridge] Setting mode: ${mode}`);
  callUnity(iframe, 'SetMode', mode);
}
