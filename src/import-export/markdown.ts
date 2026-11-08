import type { NodeData } from '../utils/types';
import { NODE_TYPE_LABELS } from '../utils/types';
import { nodeTypeLabel } from './schema';
import { slugify } from '../utils/id';

export function nodeToMarkdown(node: NodeData): string {
  const tags = node.tags.join(', ');
  const lines = [
    '---',
    `title: ${JSON.stringify(node.title)}`,
    `id: ${node.id}`,
    `type: ${node.type}`,
    `tags: ${JSON.stringify(node.tags)}`,
    `color: ${node.color}`,
    `size: ${node.size}`,
    `x: ${Math.round(node.x)}`,
    `y: ${Math.round(node.y)}`,
    `created: ${new Date(node.createdAt).toISOString()}`,
    `updated: ${new Date(node.updatedAt).toISOString()}`,
    `pinned: ${node.isPinned}`,
    '---',
    '',
    `# ${node.title}`,
    '',
    `> ${nodeTypeLabel(node.type)}${tags ? ` · ${tags}` : ''}`,
    '',
    node.body.trim(),
    '',
  ];
  return lines.join('\n');
}

export function galaxyIndexMarkdown(nodes: NodeData[]): string {
  const byType = new Map<string, NodeData[]>();
  for (const node of nodes) {
    const list = byType.get(node.type) ?? [];
    list.push(node);
    byType.set(node.type, list);
  }
  const lines = ['# Thought Galaxy 导出', '', `导出时间：${new Date().toISOString()}`, '', `共 ${nodes.length} 颗星球`, ''];
  for (const [type, list] of [...byType.entries()].sort()) {
    lines.push(`## ${NODE_TYPE_LABELS[type as keyof typeof NODE_TYPE_LABELS] ?? type} (${list.length})`, '');
    for (const node of list.sort((a, b) => b.updatedAt - a.updatedAt)) {
      lines.push(`- [${node.title}](./${slugify(node.title, node.id)}.md)${node.tags.length ? ` — ${node.tags.map((t) => `#${t}`).join(' ')}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

interface ParsedFrontMatter {
  data: Record<string, string>;
  body: string;
}

function parseFrontMatter(source: string): ParsedFrontMatter {
  const normalized = source.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---')) return { data: {}, body: normalized };
  const end = normalized.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: normalized };
  const header = normalized.slice(3, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n+/, '');
  const data: Record<string, string> = {};
  for (const line of header.split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    let value = line.slice(separator + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      try {
        value = JSON.parse(value) as string;
      } catch {
        value = value.slice(1, -1);
      }
    }
    data[key] = value;
  }
  return { data, body };
}

function extractHeading(body: string): { title: string | null; rest: string } {
  const match = body.match(/^\s*#\s+(.+)\n?/);
  if (!match) return { title: null, rest: body };
  return { title: match[1].trim(), rest: body.slice(match[0].length) };
}

/**
 * Parses a single markdown file (optionally with YAML-ish front matter) into a
 * loose node record; `validateImport` performs the strict coercion afterwards.
 */
export function markdownToRawNode(source: string, fallbackName = ''): Record<string, unknown> {
  const { data, body } = parseFrontMatter(source);
  const heading = extractHeading(body);
  const inlineTags = [...body.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu)].map((m) => m[1]);
  const tagValue = data.tags ?? '';
  let tags: string[] = [];
  if (tagValue) {
    try {
      const parsed = JSON.parse(tagValue) as unknown;
      if (Array.isArray(parsed)) tags = parsed.map(String);
    } catch {
      tags = tagValue.split(/[,，#\s]+/).filter(Boolean);
    }
  }
  tags = [...new Set([...tags, ...inlineTags])];

  const title = data.title || heading.title || fallbackName.replace(/\.md$/i, '') || '未命名星球';

  return {
    id: data.id,
    title,
    body: heading.rest.trim(),
    type: data.type ?? 'note',
    tags,
    color: data.color,
    size: data.size ? Number(data.size) : undefined,
    x: data.x !== undefined ? Number(data.x) : undefined,
    y: data.y !== undefined ? Number(data.y) : undefined,
    createdAt: data.created,
    updatedAt: data.updated,
    isPinned: data.pinned === 'true',
  };
}

export function filesToRawNodes(files: Array<{ name: string; text: string }>): unknown[] {
  return files.map((file) => markdownToRawNode(file.text, file.name));
}