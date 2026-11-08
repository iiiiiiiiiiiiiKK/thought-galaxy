import { strToU8, unzipSync, zipSync } from 'fflate';
import type { DailyThoughtData, EdgeData, NodeData } from '../utils/types';
import { buildPayload, validateImport, type ImportResult } from './schema';
import { galaxyIndexMarkdown, nodeToMarkdown, markdownToRawNode } from './markdown';
import { slugify } from '../utils/id';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${`${d.getMonth() + 1}`.padStart(2, '0')}${`${d.getDate()}`.padStart(2, '0')}`;
}

export function exportJSON(nodes: NodeData[], edges: EdgeData[], thoughts: DailyThoughtData[]): void {
  const payload = buildPayload(nodes, edges, thoughts);
  downloadText(JSON.stringify(payload, null, 2), `thought-galaxy-${todayStamp()}.json`, 'application/json');
}

export function exportMarkdownBundle(nodes: NodeData[], edges: EdgeData[]): void {
  const files: Record<string, Uint8Array> = {};
  files['README.md'] = strToU8(galaxyIndexMarkdown(nodes));
  const usedNames = new Set<string>();
  for (const node of nodes) {
    let name = `${slugify(node.title, node.id)}.md`;
    let counter = 2;
    while (usedNames.has(name)) {
      name = `${slugify(node.title, node.id)}-${counter}.md`;
      counter += 1;
    }
    usedNames.add(name);
    files[name] = strToU8(nodeToMarkdown(node));
  }
  files['links.md'] = strToU8(
    [
      '# 关联关系',
      '',
      ...edges.map((edge) => {
        const source = nodes.find((n) => n.id === edge.source)?.title ?? edge.source;
        const target = nodes.find((n) => n.id === edge.target)?.title ?? edge.target;
        return `- ${source} → ${target} (${edge.relation})`;
      }),
      '',
    ].join('\n'),
  );
  const zipped = zipSync(files, { level: 6 });
  downloadBlob(new Blob([zipped as BlobPart], { type: 'application/zip' }), `thought-galaxy-markdown-${todayStamp()}.zip`);
}

export function exportFullZip(
  nodes: NodeData[],
  edges: EdgeData[],
  thoughts: DailyThoughtData[],
): void {
  const files: Record<string, Uint8Array> = {};
  files['thought-galaxy.json'] = strToU8(JSON.stringify(buildPayload(nodes, edges, thoughts), null, 2));
  files['nodes/README.md'] = strToU8(galaxyIndexMarkdown(nodes));
  const usedNames = new Set<string>();
  for (const node of nodes) {
    let name = `${slugify(node.title, node.id)}.md`;
    let counter = 2;
    while (usedNames.has(name)) {
      name = `${slugify(node.title, node.id)}-${counter}.md`;
      counter += 1;
    }
    usedNames.add(name);
    files[`nodes/${name}`] = strToU8(nodeToMarkdown(node));
  }
  files['thoughts.json'] = strToU8(JSON.stringify(thoughts, null, 2));
  files['links.json'] = strToU8(JSON.stringify(edges, null, 2));
  const zipped = zipSync(files, { level: 6 });
  downloadBlob(new Blob([zipped as BlobPart], { type: 'application/zip' }), `thought-galaxy-full-${todayStamp()}.zip`);
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : '未知错误';
    throw new Error(`文件「${file.name}」不是有效的 JSON：${detail}`);
  }
}

export async function readMarkdownFiles(files: File[]): Promise<unknown[]> {
  const parsed: unknown[] = [];
  for (const file of files) {
    const text = await file.text();
    parsed.push(markdownToRawNode(text, file.name));
  }
  return parsed;
}

export async function importFromFiles(files: File[], existingNodeIds: Set<string>): Promise<ImportResult> {
  const jsonFiles = files.filter((file) => /\.json$/i.test(file.name));
  const mdFiles = files.filter((file) => /\.(md|markdown|txt)$/i.test(file.name));

  if (jsonFiles.length > 0) {
    const payload = await readJsonFile(jsonFiles[0]);
    return validateImport(payload, existingNodeIds);
  }

  if (mdFiles.length > 0) {
    const rawNodes = await readMarkdownFiles(mdFiles);
    return validateImport({ nodes: rawNodes }, existingNodeIds);
  }

  throw new Error('未识别的文件类型：请选择 .json 或 .md 文件');
}

/** Reads a ZIP exported by this app (full backup) and extracts its JSON payload. */
export async function importFromZip(file: File, existingNodeIds: Set<string>): Promise<ImportResult> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(buffer);
  const jsonEntry = Object.keys(entries).find((name) => name.endsWith('thought-galaxy.json'));
  if (jsonEntry) {
    const text = new TextDecoder().decode(entries[jsonEntry]);
    return validateImport(JSON.parse(text) as unknown, existingNodeIds);
  }
  const markdownEntries = Object.keys(entries).filter((name) => /\.(md|markdown)$/i.test(name));
  if (markdownEntries.length === 0) throw new Error('ZIP 中既没有 thought-galaxy.json 也没有 Markdown 文件');
  const rawNodes = markdownEntries.map((name) =>
    markdownToRawNode(new TextDecoder().decode(entries[name]), name.split('/').pop() ?? name),
  );
  return validateImport({ nodes: rawNodes }, existingNodeIds);
}