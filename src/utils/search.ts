import type { EdgeData, NodeData } from './types';
import type { Filters } from '../store/ui';

export interface SearchHit {
  node: NodeData;
  score: number;
  field: 'title' | 'body' | 'tag' | 'type';
  snippet: string;
}

const DAY = 86_400_000;

export function matchesFilters(node: NodeData, filters: Filters, now = Date.now()): boolean {
  if (filters.favoriteOnly && !node.isPinned) return false;
  if (filters.types.length > 0 && !filters.types.includes(node.type)) return false;
  if (filters.tags.length > 0 && !filters.tags.some((tag) => node.tags.includes(tag))) return false;
  if (filters.createdWithinDays !== null && now - node.createdAt > filters.createdWithinDays * DAY) return false;
  return true;
}

function snippetFor(text: string, lowerQuery: string): string {
  const index = text.toLowerCase().indexOf(lowerQuery);
  if (index < 0) return text.slice(0, 120);
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + lowerQuery.length + 80);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

/**
 * Deterministic scoring search across title / tags / type / body.
 * No external service, no fake semantic ranking.
 */
export function searchNodes(nodes: NodeData[], query: string, filters?: Filters): SearchHit[] {
  const trimmed = query.trim();
  const activeFilters = filters ?? { query: trimmed, types: [], tags: [], createdWithinDays: null, favoriteOnly: false };
  const pool = nodes.filter((node) => matchesFilters(node, activeFilters));
  if (!trimmed) {
    return pool
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((node) => ({ node, score: 0, field: 'title' as const, snippet: node.body.slice(0, 120) }));
  }

  const lower = trimmed.toLowerCase();
  const hits: SearchHit[] = [];

  for (const node of pool) {
    let score = 0;
    let field: SearchHit['field'] = 'body';
    let snippet = '';

    const title = node.title.toLowerCase();
    if (title === lower) score += 120;
    else if (title.startsWith(lower)) score += 80;
    else if (title.includes(lower)) score += 55;
    if (score > 0) field = 'title';

    const matchingTags = node.tags.filter((tag) => tag.toLowerCase().includes(lower));
    if (matchingTags.length > 0) {
      score += 40 + matchingTags.length * 5;
      if (field === 'body') field = 'tag';
      snippet = `#${matchingTags.join(' #')}`;
    }

    const typeLabel = node.type;
    if (typeLabel.includes(lower)) score += 12;

    const bodyIndex = node.body.toLowerCase().indexOf(lower);
    if (bodyIndex >= 0) {
      score += 22;
      if (field === 'body') {
        field = 'body';
        snippet = snippetFor(node.body, lower);
      }
    }

    if (score > 0) {
      hits.push({ node, score, field, snippet: snippet || node.body.slice(0, 120) });
    }
  }

  return hits.sort((a, b) => b.score - a.score || b.node.updatedAt - a.node.updatedAt);
}

export interface ExploreResult {
  rootId: string;
  depth: number;
  byDepth: Map<string, number>;
  nodes: NodeData[];
  edges: EdgeData[];
  clusterPeers: string[];
}

/**
 * Walks manual edges out to `depth` hops and includes same-cluster siblings,
 * so "Explore" answers "what is connected to what".
 */
export function exploreFrom(
  rootId: string,
  nodes: NodeData[],
  edges: EdgeData[],
  depth: number,
  clusterOf?: (nodeId: string) => string | null,
): ExploreResult {
  const byDepth = new Map<string, number>();
  const included = new Set<string>([rootId]);
  byDepth.set(rootId, 0);
  let frontier = [rootId];

  for (let level = 1; level <= depth; level += 1) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const edge of edges) {
        const other = edge.source === current ? edge.target : edge.target === current ? edge.source : null;
        if (!other || included.has(other)) continue;
        included.add(other);
        byDepth.set(other, level);
        next.push(other);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  const clusterPeers: string[] = [];
  if (clusterOf) {
    const clusterId = clusterOf(rootId);
    if (clusterId) {
      for (const node of nodes) {
        if (node.id === rootId || included.has(node.id)) continue;
        if (clusterOf(node.id) === clusterId) {
          clusterPeers.push(node.id);
          included.add(node.id);
        }
      }
    }
  }

  return {
    rootId,
    depth,
    byDepth,
    nodes: nodes.filter((node) => included.has(node.id)),
    edges: edges.filter((edge) => included.has(edge.source) && included.has(edge.target)),
    clusterPeers,
  };
}

export function degreeMap(edges: EdgeData[]): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }
  return degrees;
}

export function relatedNodes(nodeId: string, nodes: NodeData[], edges: EdgeData[]): NodeData[] {
  const ids = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return [...ids].map((id) => byId.get(id)).filter((node): node is NodeData => Boolean(node));
}