export const ARENA_EMOJIS = [
  '🤖',
  '⚔️',
  '🔥',
  '💀',
  '👑',
  '🛡️',
  '⚡',
  '💥',
  '🎯',
  '🏆',
  '👏',
  '🙌',
  '💪',
  '😤',
  '😈',
  '🤯',
  '😱',
  '🎉',
  '🔥',
  '❤️',
  '💙',
  '🧡',
  '💚',
  '💜',
  '🩵',
  '🤍',
  '🖤',
] as const;

export type ArenaEmoji = (typeof ARENA_EMOJIS)[number];

const RECENT_KEY = 'lanista-arena-recent-emojis';
const MAX_RECENT = 8;

export function getRecentEmojis(): ArenaEmoji[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((e): e is ArenaEmoji => ARENA_EMOJIS.includes(e as ArenaEmoji)).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentEmoji(emoji: ArenaEmoji): void {
  const recent = getRecentEmojis();
  const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
