import type { ClusterData, EdgeData, NodeData } from './types';
import { colorForTag } from './colors';

interface ClusterInput {
  nodes: NodeData[];
  edges: EdgeData[];
}

/**
 * Deterministic, explainable clustering.
 *
 * Rules (no ML involved, by design):
 *  1. Every tag with at least `minTagSize` nodes becomes a candidate cluster.
 *  2. Nodes join the cluster of their strongest tag (the tag shared by the
 *     largest number of their own nodes, ties broken alphabetically) so a node
 *     belongs to at most one cluster.
 *  3. Nodes with no tag are pulled into a cluster when they are connected to at
 *     least half of that cluster's members by manual edges.
 *  4. Leftover nodes form an "未分类" cluster only when there are 2+ of them.
 */
export function computeClusters({ nodes, edges }: ClusterInput, minTagSize = 2): ClusterData[] {
  if (nodes.length === 0) return [];

  const tagCounts = new Map<string, number>();
  for (const node of nodes) {
    for (const tag of new Set(node.tags)) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const candidateTags = [...tagCounts.entries()]
    .filter(([, count]) => count >= minTagSize)
    .sort((a, b) => (b[1] - a[1] || a[0].localeCompare(b[0])));

  const assignment = new Map<string, string>();
  const clusterMembers = new Map<string, string[]>();

  for (const [tag] of candidateTags) {
    const clusterId = `tag:${tag}`;
    const members: string[] = [];
    for (const node of nodes) {
      if (assignment.has(node.id)) continue;
      if (node.tags.includes(tag)) {
        assignment.set(node.id, clusterId);
        members.push(node.id);
      }
    }
    if (members.length >= minTagSize) clusterMembers.set(clusterId, members);
  }

  // Attach untagged-but-connected nodes to the cluster they mostly point at.
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }

  for (const node of nodes) {
    if (assignment.has(node.id)) continue;
    const neighbors = adjacency.get(node.id);
    if (!neighbors || neighbors.size === 0) continue;
    const score = new Map<string, number>();
    for (const neighbor of neighbors) {
      const clusterId = assignment.get(neighbor);
      if (!clusterId) continue;
      score.set(clusterId, (score.get(clusterId) ?? 0) + 1);
    }
    let best: { id: string; count: number } | null = null;
    for (const [id, count] of score) {
      if (!best || count > best.count) best = { id, count };
    }
    if (best && best.count >= 2) {
      assignment.set(node.id, best.id);
      const members = clusterMembers.get(best.id) ?? [];
      members.push(node.id);
      clusterMembers.set(best.id, members);
    }
  }

  const clusters: ClusterData[] = [];
  for (const [clusterId, memberIds] of clusterMembers) {
    const label = clusterId.startsWith('tag:') ? clusterId.slice(4) : clusterId;
    clusters.push({
      id: clusterId,
      label,
      color: colorForTag(label),
      nodeIds: [...memberIds],
      isCollapsed: false,
    });
  }

  const orphans = nodes.filter((node) => !assignment.has(node.id)).map((node) => node.id);
  if (orphans.length >= 2) {
    clusters.push({
      id: 'cluster:unclassified',
      label: '未分类',
      color: '#64748b',
      nodeIds: orphans,
      isCollapsed: false,
    });
  }

  return clusters;
}

export function clusterBoundingBox(nodes: NodeData[], nodeIds: string[], padding = 90) {
  const members = nodes.filter((node) => nodeIds.includes(node.id));
  if (members.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of members) {
    const radius = node.size * 26;
    minX = Math.min(minX, node.x - radius);
    minY = Math.min(minY, node.y - radius);
    maxX = Math.max(maxX, node.x + radius);
    maxY = Math.max(maxY, node.y + radius);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export function allTags(nodes: NodeData[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const tag of new Set(node.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}