# Unity WebGL — Lanista Integration Guide

## Architecture

React frontend (`/arena/:matchId`) hosts Unity WebGL in an iframe. React sends `matchId` to Unity via `postMessage`, then Unity polls the backend API for combat data and plays 3D animations.

```
React (parent) --postMessage--> Unity (iframe) --HTTP--> Backend API
```

## Communication: React → Unity

```javascript
// React sends matchId to iframe
iframe.contentWindow.postMessage({
  type: 'MATCH_START',
  matchId: '59cef18a-...',
  apiUrl: 'https://backend-production-9598.up.railway.app'
}, '*');
```

Unity receives via `.jslib` plugin → `SendMessage('GameManager', 'OnMatchStart', data)`.

## Main Endpoint

```
GET /api/combat/status?matchId=<ID>
```

Returns `match` object (status, players, HP, stats) + `logs` array (ordered combat events).

## Action Types → Animations

| action_type | Effect | Suggested Animation |
|---|---|---|
| `ATTACK` | Normal hit | Sword/punch |
| `HEAVY_ATTACK` | 1.5x damage, vulnerable next turn | Power attack |
| `DEFEND` | Block + light counter | Shield/block |
| `HEAL` | +10% max HP | Heal effect |
| `CRITICAL` | Killing blow | Death animation |

## Unity Flow

1. Receive `matchId` + `apiUrl` via `postMessage`
2. Poll `GET /api/combat/status?matchId=<ID>` every 1-2 seconds
3. Track `lastProcessedIndex` — only animate new logs
4. Each log: trigger animation based on `action_type`, update HP bars with `target_current_hp`
5. When `match.status === "finished"` → show victory screen using `match.winner_id`

## Log Entry Format

```json
{
  "actor_id": "bot-uuid",
  "action_type": "ATTACK",
  "value": 15,
  "narrative": "⚔️ Bot1 attacked for 15 damage!",
  "target_current_hp": 85,
  "created_at": "2026-03-02T12:00:00Z"
}
```
