import { create } from 'zustand';
import type { AppSettings, DailyThoughtData, EdgeData, NodeData } from '../utils/types';
import { DEFAULT_SETTINGS } from '../utils/types';
import {
  clearDemo as clearDemoRecords,
  deleteNodeCascade,
  deleteEdge as deleteEdgeRecord,
  deleteThought as deleteThoughtRecord,
  loadSnapshot,
  putEdge,
  putEdges,
  putNode,
  putNodes,
  putThought,
  putThoughts,
  replaceAll,
} from '../database/repository';
import { readMeta, writeMeta, META_KEYS } from '../database/db';
import type { GalaxySnapshot } from '../database/repository';

export interface GalaxyState {
  nodes: NodeData[];
  edges: EdgeData[];
  thoughts: DailyThoughtData[];
  settings: AppSettings;
  ready: boolean;
  storageError: string | null;

  hydrate: () => Promise<void>;
  seedIfFirstRun: () => Promise<boolean>;
  clearDemo: () => Promise<void>;

  createNode: (input: Partial<NodeData> & { title: string }) => Promise<NodeData>;
  updateNode: (id: string, patch: Partial<NodeData>) => Promise<void>;
  removeNode: (id: string) => Promise<void>;

  createEdge: (source: string, target: string, relation: EdgeData['relation']) => Promise<EdgeData | null>;
  removeEdge: (id: string) => Promise<void>;

  addThought: (content: string, date: string) => Promise<DailyThoughtData>;
  removeThought: (id: string) => Promise<void>;

  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  importSnapshot: (snapshot: GalaxySnapshot, mode: 'merge' | 'replace') => Promise<{ added: number; skipped: number }>;
  resetAll: () => Promise<void>;
}

function nowNode(input: Partial<NodeData> & { title: string }): NodeData {
  const stamp = Date.now();
  return {
    id: input.id ?? `n-${stamp.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type ?? 'idea',
    title: input.title,
    body: input.body ?? '',
    tags: input.tags ?? [],
    color: input.color ?? '#3b82f6',
    x: input.x ?? 0,
    y: input.y ?? 0,
    size: input.size ?? 1,
    createdAt: input.createdAt ?? stamp,
    updatedAt: stamp,
    isPinned: input.isPinned ?? false,
    isDemo: false,
    meta: input.meta,
  };
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  nodes: [],
  edges: [],
  thoughts: [],
  settings: DEFAULT_SETTINGS,
  ready: false,
  storageError: null,

  hydrate: async () => {
    try {
      const settingsRecord = await readMeta<Partial<AppSettings>>(META_KEYS.settings, {});
      const snapshot = await loadSnapshot();
      set({
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        thoughts: snapshot.thoughts,
        settings: { ...DEFAULT_SETTINGS, ...settingsRecord },
        ready: true,
        storageError: null,
      });
    } catch (error) {
      set({
        ready: true,
        storageError: error instanceof Error ? error.message : 'IndexedDB 初始化失败',
      });
    }
  },

  seedIfFirstRun: async () => {
    const seeded = await readMeta(META_KEYS.seeded, false);
    if (seeded) return false;
    if (get().nodes.length > 0) return false;
    const { makeDemoNodes, makeDemoEdges, makeDemoThoughts } = await import('../database/demo');
    const snapshot: GalaxySnapshot = {
      nodes: makeDemoNodes(),
      edges: makeDemoEdges(),
      thoughts: makeDemoThoughts(),
    };
    await replaceAll(snapshot);
    await writeMeta(META_KEYS.seeded, true);
    set({ nodes: snapshot.nodes, edges: snapshot.edges, thoughts: snapshot.thoughts });
    return true;
  },

  clearDemo: async () => {
    await clearDemoRecords();
    set((state) => {
      const demoIds = new Set(state.nodes.filter((n) => n.isDemo).map((n) => n.id));
      return {
        nodes: state.nodes.filter((n) => !demoIds.has(n.id)),
        edges: state.edges.filter((e) => !demoIds.has(e.source) && !demoIds.has(e.target)),
        thoughts: state.thoughts.filter((t) => !t.id.startsWith('demo-')),
      };
    });
    await writeMeta(META_KEYS.seeded, false);
    await writeMeta(META_KEYS.demoCleared, true);
  },

  createNode: async (input) => {
    const node = nowNode(input);
    await putNode(node);
    set((state) => ({ nodes: [...state.nodes, node] }));
    return node;
  },

  updateNode: async (id, patch) => {
    let updated: NodeData | undefined;
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== id) return node;
        updated = { ...node, ...patch, id: node.id, updatedAt: Date.now() };
        return updated;
      }),
    }));
    if (updated) await putNode(updated);
  },

  removeNode: async (id) => {
    await deleteNodeCascade(id);
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
    }));
  },

  createEdge: async (source, target, relation) => {
    if (source === target) return null;
    const exists = get().edges.some(
      (edge) =>
        (edge.source === source && edge.target === target) ||
        (edge.source === target && edge.target === source),
    );
    if (exists) return null;
    const edge: EdgeData = {
      id: `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      source,
      target,
      relation,
      createdAt: Date.now(),
    };
    await putEdge(edge);
    set((state) => ({ edges: [...state.edges, edge] }));
    return edge;
  },

  removeEdge: async (id) => {
    await deleteEdgeRecord(id);
    set((state) => ({ edges: state.edges.filter((edge) => edge.id !== id) }));
  },

  addThought: async (content, date) => {
    const thought: DailyThoughtData = {
      id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      content,
      date,
      createdAt: Date.now(),
    };
    await putThought(thought);
    set((state) => ({ thoughts: [...state.thoughts, thought] }));
    return thought;
  },

  removeThought: async (id) => {
    await deleteThoughtRecord(id);
    set((state) => ({ thoughts: state.thoughts.filter((thought) => thought.id !== id) }));
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await writeMeta(META_KEYS.settings, settings);
  },

  importSnapshot: async (snapshot, mode) => {
    const existingNodeIds = new Set(get().nodes.map((n) => n.id));
    const existingEdgeIds = new Set(get().edges.map((e) => e.id));
    const incomingNodes = snapshot.nodes.filter((n) => mode === 'replace' || !existingNodeIds.has(n.id));
    const nodesForEdges = new Set(
      mode === 'replace' ? incomingNodes.map((n) => n.id) : [...existingNodeIds, ...incomingNodes.map((n) => n.id)],
    );
    const incomingEdges = snapshot.edges.filter(
      (e) => nodesForEdges.has(e.source) && nodesForEdges.has(e.target) && e.source !== e.target,
    );
    const skipped =
      snapshot.nodes.length -
      incomingNodes.length +
      (snapshot.edges.length - incomingEdges.length);

    if (mode === 'replace') {
      await replaceAll({ nodes: snapshot.nodes, edges: incomingEdges, thoughts: snapshot.thoughts });
      set({ nodes: snapshot.nodes, edges: incomingEdges, thoughts: snapshot.thoughts });
      return { added: snapshot.nodes.length, skipped: snapshot.edges.length - incomingEdges.length };
    }

    await putNodes(incomingNodes);
    const freshEdges = incomingEdges.filter((e) => !existingEdgeIds.has(e.id));
    await putEdges(freshEdges);
    const newThoughts = snapshot.thoughts.filter((t) => !get().thoughts.some((x) => x.id === t.id));
    await putThoughts(newThoughts);

    set((state) => ({
      nodes: [...state.nodes, ...incomingNodes],
      edges: [...state.edges, ...freshEdges],
      thoughts: [...state.thoughts, ...newThoughts],
    }));
    return { added: incomingNodes.length, skipped };
  },

  resetAll: async () => {
    await replaceAll({ nodes: [], edges: [], thoughts: [] });
    await writeMeta(META_KEYS.seeded, true);
    set({ nodes: [], edges: [], thoughts: [] });
  },
}));