export interface NodeData {
  id: string;
  type: NodeType;
  title: string;
  body: string;
  tags: string[];
  color: string;
  x: number;
  y: number;
  size: number;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isDemo: boolean;
  meta?: Record<string, unknown>;
}

export type NodeType =
  | 'idea'
  | 'note'
  | 'article'
  | 'book'
  | 'webpage'
  | 'project'
  | 'goal'
  | 'inspiration';

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  idea: '想法',
  note: '笔记',
  article: '文章',
  book: '书籍',
  webpage: '网页',
  project: '项目',
  goal: '目标',
  inspiration: '灵感',
};

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  idea: '#3b82f6',
  note: '#22c55e',
  article: '#8b5cf6',
  book: '#f59e0b',
  webpage: '#06b6d4',
  project: '#ec4899',
  goal: '#ef4444',
  inspiration: '#a855f7',
};

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  relation: RelationType;
  createdAt: number;
}

export type RelationType =
  | 'related'
  | 'causal'
  | 'extends'
  | 'contrast'
  | 'reference'
  | 'inspiration';

export const RELATION_LABELS: Record<RelationType, string> = {
  related: '相关',
  causal: '因果',
  extends: '延伸',
  contrast: '对比',
  reference: '引用',
  inspiration: '灵感来源',
};

export const RELATION_STYLES: Record<RelationType, { color: string; dash?: number[] }> = {
  related: { color: '#3b82f6' },
  causal: { color: '#ef4444', dash: [4, 4] },
  extends: { color: '#22c55e', dash: [8, 4] },
  contrast: { color: '#f59e0b', dash: [2, 2] },
  reference: { color: '#8b5cf6' },
  inspiration: { color: '#a855f7', dash: [6, 3] },
};

export interface ClusterData {
  id: string;
  label: string;
  color: string;
  nodeIds: string[];
  boundingBox?: { x: number; y: number; width: number; height: number };
  isCollapsed: boolean;
}

export interface DailyThoughtData {
  id: string;
  date: string;
  content: string;
  createdAt: number;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  canvasQuality: 'high' | 'medium' | 'low';
  showOrbits: boolean;
  showLabels: boolean;
  autoCluster: boolean;
  language: 'zh-CN' | 'en';
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  canvasQuality: 'high',
  showOrbits: true,
  showLabels: true,
  autoCluster: true,
  language: 'zh-CN',
};