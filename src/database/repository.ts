import { getDB } from './db';
import type { DailyThoughtData, EdgeData, NodeData } from '../utils/types';

export interface GalaxySnapshot {
  nodes: NodeData[];
  edges: EdgeData[];
  thoughts: DailyThoughtData[];
}

export async function loadSnapshot(): Promise<GalaxySnapshot> {
  const db = getDB();
  const [nodes, edges, thoughts] = await Promise.all([
    db.nodes.toArray(),
    db.edges.toArray(),
    db.thoughts.toArray(),
  ]);
  return { nodes, edges, thoughts };
}

export async function putNode(node: NodeData): Promise<void> {
  await getDB().nodes.put(node);
}

export async function putNodes(nodes: NodeData[]): Promise<void> {
  if (nodes.length === 0) return;
  await getDB().nodes.bulkPut(nodes);
}

export async function deleteNodeCascade(nodeId: string): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.nodes, db.edges, async () => {
    await db.nodes.delete(nodeId);
    const edges = await db.edges.toArray();
    const doomed = edges.filter((e) => e.source === nodeId || e.target === nodeId).map((e) => e.id);
    if (doomed.length) await db.edges.bulkDelete(doomed);
  });
}

export async function putEdge(edge: EdgeData): Promise<void> {
  await getDB().edges.put(edge);
}

export async function putEdges(edges: EdgeData[]): Promise<void> {
  if (edges.length === 0) return;
  await getDB().edges.bulkPut(edges);
}

export async function deleteEdge(edgeId: string): Promise<void> {
  await getDB().edges.delete(edgeId);
}

export async function putThought(thought: DailyThoughtData): Promise<void> {
  await getDB().thoughts.put(thought);
}

export async function putThoughts(thoughts: DailyThoughtData[]): Promise<void> {
  if (thoughts.length === 0) return;
  await getDB().thoughts.bulkPut(thoughts);
}

export async function deleteThought(id: string): Promise<void> {
  await getDB().thoughts.delete(id);
}

export async function replaceAll(snapshot: GalaxySnapshot): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.nodes, db.edges, db.thoughts, async () => {
    await Promise.all([db.nodes.clear(), db.edges.clear(), db.thoughts.clear()]);
    if (snapshot.nodes.length) await db.nodes.bulkPut(snapshot.nodes);
    if (snapshot.edges.length) await db.edges.bulkPut(snapshot.edges);
    if (snapshot.thoughts.length) await db.thoughts.bulkPut(snapshot.thoughts);
  });
}

export async function clearDemo(): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.nodes, db.edges, async () => {
    const demoNodes = await db.nodes.filter((n) => n.isDemo === true).toArray();
    const demoIds = new Set(demoNodes.map((n) => n.id));
    if (demoIds.size === 0) return;
    await db.nodes.bulkDelete([...demoIds]);
    const edges = await db.edges.toArray();
    const doomed = edges
      .filter((e) => demoIds.has(e.source) || demoIds.has(e.target))
      .map((e) => e.id);
    if (doomed.length) await db.edges.bulkDelete(doomed);
  });
}