import { describe, expect, it } from 'vitest';
import { computeClusters, allTags } from '../../src/utils/clusters';
import { searchNodes, matchesFilters, exploreFrom, degreeMap, relatedNodes } from '../../src/utils/search';
import { thoughtStreak, dateKey, nodeStats } from '../../src/utils/format';
import { spiralPosition, boundsOf } from '../../src/utils/geometry';
import type { DailyThoughtData, EdgeData, NodeData } from '../../src/utils/types';

const node = (id: string, overrides: Partial<NodeData> = {}): NodeData => ({
  id,
  type: 'idea',
  title: id,
  body: '',
  tags: [],
  color: '#3b82f6',
  x: 0,
  y: 0,
  size: 1,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  isPinned: false,
  isDemo: false,
  ...overrides,
});

const edge = (id: string, source: string, target: string): EdgeData => ({
  id,
  source,
  target,
  relation: 'related',
  createdAt: 1_700_000_000_000,
});

describe('computeClusters', () => {
  it('creates a cluster for tags shared by at least two nodes', () => {
    const nodes = [
      node('a', { tags: ['AI'] }),
      node('b', { tags: ['AI'] }),
      node('c', { tags: ['写作'] }),
    ];
    const clusters = computeClusters({ nodes, edges: [] });
    const ai = clusters.find((c) => c.label === 'AI');
    expect(ai?.nodeIds.sort()).toEqual(['a', 'b']);
  });

  it('assigns each node to at most one cluster', () => {
    const nodes = [
      node('a', { tags: ['AI', '创业'] }),
      node('b', { tags: ['AI'] }),
      node('c', { tags: ['创业'] }),
      node('d', { tags: ['创业'] }),
    ];
    const clusters = computeClusters({ nodes, edges: [] });
    const ids = clusters.flatMap((c) => c.nodeIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('attaches untagged nodes through manual edges', () => {
    const nodes = [
      node('a', { tags: ['AI'] }),
      node('b', { tags: ['AI'] }),
      node('x'),
    ];
    const edges = [edge('e1', 'x', 'a'), edge('e2', 'x', 'b')];
    const clusters = computeClusters({ nodes, edges });
    const ai = clusters.find((c) => c.label === 'AI');
    expect(ai?.nodeIds).toContain('x');
  });

  it('returns nothing for an empty galaxy', () => {
    expect(computeClusters({ nodes: [], edges: [] })).toEqual([]);
  });
});

describe('allTags', () => {
  it('counts unique tags per node', () => {
    const nodes = [node('a', { tags: ['x', 'x', 'y'] }), node('b', { tags: ['y'] })];
    expect(allTags(nodes)).toEqual([
      { tag: 'y', count: 2 },
      { tag: 'x', count: 1 },
    ]);
  });
});

describe('searchNodes', () => {
  const nodes = [
    node('a', { title: '深度学习笔记', body: '关于 transformer 的想法', tags: ['AI'] }),
    node('b', { title: '创业计划', body: '做一个产品', tags: ['创业'] }),
  ];

  it('ranks title matches above body matches', () => {
    const hits = searchNodes(nodes, '深度');
    expect(hits[0].node.id).toBe('a');
    expect(hits[0].field).toBe('title');
  });

  it('matches tags', () => {
    const hits = searchNodes(nodes, '创业');
    expect(hits[0].node.id).toBe('b');
  });

  it('returns recent nodes for an empty query', () => {
    const hits = searchNodes(nodes, '');
    expect(hits).toHaveLength(2);
  });

  it('applies filters', () => {
    const hits = searchNodes(nodes, '', {
      query: '',
      types: ['idea'],
      tags: ['AI'],
      createdWithinDays: null,
      favoriteOnly: false,
    });
    expect(hits.map((h) => h.node.id)).toEqual(['a']);
  });
});

describe('matchesFilters', () => {
  const now = 1_700_000_000_000;
  const fresh = node('fresh', { createdAt: now - 1000, isPinned: true });
  const old = node('old', { createdAt: now - 90 * 86_400_000 });

  it('filters by favorites', () => {
    expect(matchesFilters(fresh, { query: '', types: [], tags: [], createdWithinDays: null, favoriteOnly: true }, now)).toBe(true);
    expect(matchesFilters(old, { query: '', types: [], tags: [], createdWithinDays: null, favoriteOnly: true }, now)).toBe(false);
  });

  it('filters by creation window', () => {
    expect(matchesFilters(fresh, { query: '', types: [], tags: [], createdWithinDays: 7, favoriteOnly: false }, now)).toBe(true);
    expect(matchesFilters(old, { query: '', types: [], tags: [], createdWithinDays: 7, favoriteOnly: false }, now)).toBe(false);
  });
});

describe('exploreFrom', () => {
  const nodes = [node('a'), node('b'), node('c'), node('d')];
  const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')];

  it('walks one hop', () => {
    const result = exploreFrom('a', nodes, edges, 1);
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
  });

  it('walks two hops', () => {
    const result = exploreFrom('a', nodes, edges, 2);
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('includes same-cluster peers', () => {
    const result = exploreFrom('a', nodes, edges, 1, (id) => (id === 'a' || id === 'd' ? 'cluster' : null));
    expect(result.clusterPeers).toContain('d');
  });
});

describe('degreeMap / relatedNodes', () => {
  const nodes = [node('a'), node('b')];
  const edges = [edge('e1', 'a', 'b')];

  it('counts edges per node', () => {
    expect(degreeMap(edges).get('a')).toBe(1);
  });

  it('lists related nodes', () => {
    expect(relatedNodes('a', nodes, edges).map((n) => n.id)).toEqual(['b']);
  });
});

describe('format helpers', () => {
  it('computes consecutive day streaks', () => {
    const now = new Date('2026-03-10T12:00:00Z').getTime();
    const thoughts: DailyThoughtData[] = [
      { id: '1', date: dateKey(now), content: 'a', createdAt: now },
      { id: '2', date: dateKey(now - 86_400_000), content: 'b', createdAt: now - 86_400_000 },
      { id: '3', date: dateKey(now - 3 * 86_400_000), content: 'c', createdAt: now - 3 * 86_400_000 },
    ];
    expect(thoughtStreak(thoughts, now)).toBe(2);
  });

  it('returns 0 for no thoughts', () => {
    expect(thoughtStreak([], Date.now())).toBe(0);
  });

  it('counts chinese characters and words', () => {
    const stats = nodeStats([node('a', { title: '标题', body: 'hello world 中文' })]);
    expect(stats.total).toBe(1);
    expect(stats.words).toBeGreaterThan(0);
  });
});

describe('geometry', () => {
  it('produces deterministic spiral positions', () => {
    expect(spiralPosition(3, 10)).toEqual(spiralPosition(3, 10));
  });

  it('computes bounds', () => {
    expect(boundsOf([{ x: 0, y: 0 }, { x: 10, y: 5 }], 0)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 5,
    });
    expect(boundsOf([])).toBeNull();
  });
});