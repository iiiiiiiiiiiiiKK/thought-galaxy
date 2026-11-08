import type { DailyThoughtData, NodeData } from './types';

const MS_DAY = 86_400_000;

export function dateKey(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${formatDate(timestamp)} ${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const diff = now - timestamp;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < MS_DAY) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < MS_DAY * 30) return `${Math.floor(diff / MS_DAY)} 天前`;
  return formatDate(timestamp);
}

/** Consecutive days (ending today or yesterday) that have at least one thought. */
export function thoughtStreak(thoughts: DailyThoughtData[], now = Date.now()): number {
  if (thoughts.length === 0) return 0;
  const days = new Set(thoughts.map((t) => t.date));
  const todayKey = dateKey(now);
  const yesterdayKey = dateKey(now - MS_DAY);
  let cursor = days.has(todayKey) ? now : days.has(yesterdayKey) ? now - MS_DAY : null;
  if (cursor === null) return 0;
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor -= MS_DAY;
  }
  return streak;
}

export function wordCount(text: string): number {
  if (!text) return 0;
  const chinese = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return chinese + words;
}

export function nodeStats(nodes: NodeData[]) {
  const total = nodes.length;
  const words = nodes.reduce((sum, node) => sum + wordCount(node.body) + wordCount(node.title), 0);
  const tags = new Set<string>();
  nodes.forEach((node) => node.tags.forEach((tag) => tags.add(tag)));
  return { total, words, tags: tags.size };
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}