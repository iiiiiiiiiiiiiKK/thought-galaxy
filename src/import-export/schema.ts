import type { DailyThoughtData, EdgeData, NodeData, NodeType } from '../utils/types';
import { NODE_TYPE_LABELS } from '../utils/types';
import { uid } from '../utils/id';
import { spiralPosition } from '../utils/geometry';

export const EXPORT_VERSION = 2;

export interface ExportPayload {
  app: 'thought-galaxy';
  version: number;
  exportedAt: string;
  nodes: NodeData[];
  edges: EdgeData[];
  thoughts: DailyThoughtData[];
}

export interface ImportResult {
  nodes: NodeData[];
  edges: EdgeData[];
  thoughts: DailyThoughtData[];
  warnings: string[];
  duplicates: string[];
  invalidEdges: string[];
  skipped: number;
}

const NODE_TYPES: NodeType[] = [
  'idea',
  'note',
  'article',
  'book',
  'webpage',
  'project',
  'goal',
  'inspiration',
];

const TYPE_ALIASES: Record<string, NodeType> = {
  idea: 'idea',
  想法: 'idea',
  note: 'note',
  笔记: 'note',
  article: 'article',
  文章: 'article',
  book: 'book',
  书籍: 'book',
  webpage: 'webpage',
  web: 'webpage',
  网页: 'webpage',
  project: 'project',
  项目: 'project',
  goal: 'goal',
  目标: 'goal',
  inspiration: 'inspiration',
  灵感: 'inspiration',
};

export function normalizeType(input: unknown): NodeType {
  if (typeof input !== 'string') return 'idea';
  const key = input.trim().toLowerCase();
  if (TYPE_ALIASES[key]) return TYPE_ALIASES[key];
  if (TYPE_ALIASES[input.trim()]) return TYPE_ALIASES[input.trim()];
  return NODE_TYPES.includes(key as NodeType) ? (key as NodeType) : 'idea';
}

function toNumber(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(num) ? num : fallback;
}

function toTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 40);
  }
  if (typeof value === 'string') {
    return [...new Set(value.split(/[,，#\s]+/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 40);
  }
  return [];
}

function toTimestamp(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Coerces an unknown record into a valid NodeData, or returns null when the
 * record cannot be trusted (missing title and body).
 */
export function coerceNode(raw: unknown, index: number, total: number, warnings: string[]): NodeData | null {
  if (!raw || typeof raw !== 'object') {
    warnings.push(`第 ${index + 1} 条记录不是对象，已跳过`);
    return null;
  }
  const record = raw as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const body = typeof record.body === 'string' ? record.body : typeof record.content === 'string' ? record.content : '';
  if (!title && !body) {
    warnings.push(`第 ${index + 1} 条记录既没有标题也没有正文，已跳过`);
    return null;
  }
  const stamp = Date.now();
  const position = spiralPosition(index, Math.max(1, total));
  const hasCoords = Number.isFinite(Number(record.x)) && Number.isFinite(Number(record.y));

  return {
    id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : uid('n-'),
    type: normalizeType(record.type),
    title: title || `未命名星球 ${index + 1}`,
    body,
    tags: toTags(record.tags),
    color: typeof record.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(record.color) ? record.color : '#3b82f6',
    x: hasCoords ? toNumber(record.x, 0) : position.x,
    y: hasCoords ? toNumber(record.y, 0) : position.y,
    size: Math.min(2.4, Math.max(0.5, toNumber(record.size, 1))),
    createdAt: toTimestamp(record.createdAt, stamp),
    updatedAt: toTimestamp(record.updatedAt, stamp),
    isPinned: record.isPinned === true || record.favorite === true,
    isDemo: false,
    meta: typeof record.meta === 'object' && record.meta ? (record.meta as Record<string, unknown>) : undefined,
  };
}

export function coerceEdge(raw: unknown, index: number, warnings: string[]): EdgeData | null {
  if (!raw || typeof raw !== 'object') {
    warnings.push(`第 ${index + 1} 条关联不是对象，已跳过`);
    return null;
  }
  const record = raw as Record<string, unknown>;
  const source = typeof record.source === 'string' ? record.source : '';
  const target = typeof record.target === 'string' ? record.target : '';
  if (!source || !target) {
    warnings.push(`第 ${index + 1} 条关联缺少 source/target，已跳过`);
    return null;
  }
  const relationRaw = typeof record.relation === 'string' ? record.relation : 'related';
  const validRelations = ['related', 'causal', 'extends', 'contrast', 'reference', 'inspiration'];
  return {
    id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : uid('e-'),
    source,
    target,
    relation: (validRelations.includes(relationRaw) ? relationRaw : 'related') as EdgeData['relation'],
    createdAt: toTimestamp(record.createdAt, Date.now()),
  };
}

export function coerceThought(raw: unknown, index: number): DailyThoughtData | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const content = typeof record.content === 'string' ? record.content : '';
  if (!content.trim()) return null;
  const stamp = toTimestamp(record.createdAt, Date.now());
  const date =
    typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
      ? record.date
      : new Date(stamp).toISOString().slice(0, 10);
  return {
    id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `t-${index}-${stamp}`,
    content,
    date,
    createdAt: stamp,
  };
}

/** Validates + de-duplicates an incoming dataset without touching stored data. */
export function validateImport(payload: unknown, existingNodeIds: Set<string> = new Set()): ImportResult {
  const warnings: string[] = [];
  const duplicates: string[] = [];
  const invalidEdges: string[] = [];
  let skipped = 0;

  const root = payload as Record<string, unknown> | null;
  const rawNodes = Array.isArray(root?.nodes) ? (root!.nodes as unknown[]) : Array.isArray(payload) ? (payload as unknown[]) : [];
  const rawEdges = Array.isArray(root?.edges) ? (root!.edges as unknown[]) : [];
  const rawThoughts = Array.isArray(root?.thoughts) ? (root!.thoughts as unknown[]) : [];

  if (rawNodes.length === 0) warnings.push('没有找到任何星球数据');

  const seen = new Set<string>(existingNodeIds);
  const nodes: NodeData[] = [];
  rawNodes.forEach((raw, index) => {
    const node = coerceNode(raw, index, rawNodes.length, warnings);
    if (!node) {
      skipped += 1;
      return;
    }
    if (seen.has(node.id)) {
      duplicates.push(node.id);
      node.id = uid('n-');
      warnings.push(`重复 ID ${node.id} 已重新生成`);
    }
    seen.add(node.id);
    nodes.push(node);
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeKeys = new Set<string>();
  const edges: EdgeData[] = [];
  rawEdges.forEach((raw, index) => {
    const edge = coerceEdge(raw, index, warnings);
    if (!edge) {
      skipped += 1;
      return;
    }
    if (edge.source === edge.target) {
      invalidEdges.push(`${edge.source} → ${edge.target}（自关联）`);
      skipped += 1;
      return;
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      invalidEdges.push(`${edge.source} → ${edge.target}（目标不存在）`);
      skipped += 1;
      return;
    }
    const key = [edge.source, edge.target].sort().join('::');
    if (edgeKeys.has(key)) {
      invalidEdges.push(`${edge.source} → ${edge.target}（重复关联）`);
      skipped += 1;
      return;
    }
    edgeKeys.add(key);
    edges.push(edge);
  });

  const thoughts: DailyThoughtData[] = [];
  rawThoughts.forEach((raw, index) => {
    const thought = coerceThought(raw, index);
    if (thought) thoughts.push(thought);
  });

  return { nodes, edges, thoughts, warnings, duplicates, invalidEdges, skipped };
}

export function buildPayload(
  nodes: NodeData[],
  edges: EdgeData[],
  thoughts: DailyThoughtData[],
): ExportPayload {
  return {
    app: 'thought-galaxy',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    nodes,
    edges,
    thoughts,
  };
}

export function nodeTypeLabel(type: NodeType): string {
  return NODE_TYPE_LABELS[type] ?? type;
}