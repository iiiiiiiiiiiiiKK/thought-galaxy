import { describe, expect, it } from 'vitest';
import { validateImport, coerceNode, normalizeType, buildPayload } from '../../src/import-export/schema';
import { nodeToMarkdown, markdownToRawNode } from '../../src/import-export/markdown';
import type { NodeData } from '../../src/utils/types';

const baseNode = (overrides: Partial<NodeData> = {}): NodeData => ({
  id: 'n1',
  type: 'idea',
  title: '测试星球',
  body: '正文内容',
  tags: ['AI'],
  color: '#3b82f6',
  x: 10,
  y: 20,
  size: 1,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  isPinned: false,
  isDemo: false,
  ...overrides,
});

describe('normalizeType', () => {
  it('accepts english ids and chinese aliases', () => {
    expect(normalizeType('note')).toBe('note');
    expect(normalizeType('笔记')).toBe('note');
    expect(normalizeType('PROJECT')).toBe('project');
  });

  it('falls back to idea for unknown input', () => {
    expect(normalizeType('nonsense')).toBe('idea');
    expect(normalizeType(undefined)).toBe('idea');
  });
});

describe('coerceNode', () => {
  it('rejects records without title and body', () => {
    const warnings: string[] = [];
    expect(coerceNode({ foo: 1 }, 0, 1, warnings)).toBeNull();
    expect(warnings).toHaveLength(1);
  });

  it('generates an id when missing and clamps size', () => {
    const warnings: string[] = [];
    const node = coerceNode({ title: 'T', size: 99 }, 0, 1, warnings)!;
    expect(node.id).toBeTruthy();
    expect(node.size).toBe(2.4);
    expect(node.isDemo).toBe(false);
  });

  it('keeps provided coordinates', () => {
    const warnings: string[] = [];
    const node = coerceNode({ title: 'T', x: 120, y: -30 }, 0, 1, warnings)!;
    expect(node.x).toBe(120);
    expect(node.y).toBe(-30);
  });

  it('derives deterministic positions when coordinates are absent', () => {
    const warnings: string[] = [];
    const a = coerceNode({ title: 'T' }, 0, 4, warnings)!;
    const b = coerceNode({ title: 'T' }, 0, 4, warnings)!;
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });
});

describe('validateImport', () => {
  it('regenerates duplicate ids instead of dropping records', () => {
    const result = validateImport({
      nodes: [
        { id: 'dup', title: 'A' },
        { id: 'dup', title: 'B' },
      ],
    });
    expect(result.nodes).toHaveLength(2);
    expect(result.duplicates).toEqual(['dup']);
    expect(result.nodes[0].id).not.toBe(result.nodes[1].id);
  });

  it('drops self edges and edges pointing at missing nodes', () => {
    const result = validateImport({
      nodes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
      edges: [
        { source: 'a', target: 'a' },
        { source: 'a', target: 'ghost' },
        { source: 'a', target: 'b' },
      ],
    });
    expect(result.edges).toHaveLength(1);
    expect(result.invalidEdges).toHaveLength(2);
  });

  it('rejects duplicate edges regardless of direction', () => {
    const result = validateImport({
      nodes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
      ],
    });
    expect(result.edges).toHaveLength(1);
    expect(result.invalidEdges).toHaveLength(1);
  });

  it('skips ids already present in the store', () => {
    const result = validateImport({ nodes: [{ id: 'a', title: 'A' }] }, new Set(['a']));
    expect(result.nodes[0].id).not.toBe('a');
    expect(result.duplicates).toEqual(['a']);
  });
});

describe('markdown round-trip', () => {
  it('preserves title, body, tags and coordinates', () => {
    const node = baseNode({ tags: ['AI', '读书'], x: 42, y: -7 });
    const md = nodeToMarkdown(node);
    const raw = markdownToRawNode(md, 'fallback.md');
    const [coerced] = validateImport({ nodes: [raw] }).nodes;
    expect(coerced.title).toBe(node.title);
    expect(coerced.body).toContain('正文内容');
    expect(coerced.tags).toEqual(['AI', '读书']);
    expect(coerced.x).toBe(42);
    expect(coerced.y).toBe(-7);
  });

  it('falls back to the first heading when front matter is absent', () => {
    const raw = markdownToRawNode('# 我的想法\n\n一些内容', 'file.md');
    expect(raw.title).toBe('我的想法');
    expect(String(raw.body)).toContain('一些内容');
  });
});

describe('buildPayload', () => {
  it('produces a versioned payload', () => {
    const payload = buildPayload([baseNode()], [], []);
    expect(payload.app).toBe('thought-galaxy');
    expect(payload.version).toBeGreaterThanOrEqual(2);
    expect(payload.nodes).toHaveLength(1);
  });
});