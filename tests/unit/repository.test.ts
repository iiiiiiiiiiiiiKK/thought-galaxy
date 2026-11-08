import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDemo,
  deleteNodeCascade,
  loadSnapshot,
  putEdge,
  putNode,
  putThought,
  replaceAll,
} from '../../src/database/repository';
import { getDB } from '../../src/database/db';
import type { NodeData } from '../../src/utils/types';

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
  createdAt: 1,
  updatedAt: 1,
  isPinned: false,
  isDemo: false,
  ...overrides,
});

beforeEach(async () => {
  const db = getDB();
  await db.nodes.clear();
  await db.edges.clear();
  await db.thoughts.clear();
});

describe('repository', () => {
  it('persists nodes across reads (refresh persistence)', async () => {
    await putNode(node('a'));
    const snapshot = await loadSnapshot();
    expect(snapshot.nodes.map((n) => n.id)).toEqual(['a']);
  });

  it('deletes a node and its edges together', async () => {
    await putNode(node('a'));
    await putNode(node('b'));
    await putEdge({ id: 'e1', source: 'a', target: 'b', relation: 'related', createdAt: 1 });
    await deleteNodeCascade('a');
    const snapshot = await loadSnapshot();
    expect(snapshot.nodes.map((n) => n.id)).toEqual(['b']);
    expect(snapshot.edges).toHaveLength(0);
  });

  it('clears only demo nodes', async () => {
    await putNode(node('demo-1', { isDemo: true }));
    await putNode(node('real-1'));
    await putNode(node('demo-2', { isDemo: true }));
    await putEdge({ id: 'e1', source: 'demo-1', target: 'demo-2', relation: 'related', createdAt: 1 });
    await putEdge({ id: 'e2', source: 'real-1', target: 'demo-1', relation: 'related', createdAt: 1 });
    await putThought({ id: 'demo-thought-1', date: '2026-01-01', content: 'x', createdAt: 1 });
    await clearDemo();
    const snapshot = await loadSnapshot();
    expect(snapshot.nodes.map((n) => n.id)).toEqual(['real-1']);
    expect(snapshot.edges).toHaveLength(0);
    expect(snapshot.thoughts).toHaveLength(1);
  });

  it('replaceAll swaps the entire dataset', async () => {
    await putNode(node('old'));
    await replaceAll({ nodes: [node('new')], edges: [], thoughts: [] });
    const snapshot = await loadSnapshot();
    expect(snapshot.nodes.map((n) => n.id)).toEqual(['new']);
  });
});