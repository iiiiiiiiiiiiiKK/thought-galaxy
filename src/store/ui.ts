import { create } from 'zustand';
import type { NodeType } from '../utils/types';

export type PanelKind =
  | 'none'
  | 'search'
  | 'command'
  | 'node-detail'
  | 'node-editor'
  | 'settings'
  | 'data'
  | 'daily'
  | 'clusters'
  | 'shortcuts';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Filters {
  query: string;
  types: NodeType[];
  tags: string[];
  createdWithinDays: number | null;
  favoriteOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  types: [],
  tags: [],
  createdWithinDays: null,
  favoriteOnly: false,
};

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface UIState {
  viewport: Viewport;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  panel: PanelKind;
  editingNodeId: string | null;
  pendingLinkFrom: string | null;
  exploreRootId: string | null;
  exploreDepth: number;
  collapsedClusters: string[];
  filters: Filters;
  toasts: Toast[];
  sidebarOpen: boolean;
  mobileSheetOpen: boolean;
  pointerMode: 'idle' | 'panning' | 'dragging-node' | 'linking';

  setViewport: (viewport: Viewport) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (clientX: number, clientY: number, factor: number) => void;
  setZoom: (zoom: number) => void;
  resetViewport: () => void;

  selectNode: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  openPanel: (panel: PanelKind) => void;
  closePanel: () => void;
  openEditor: (nodeId?: string) => void;
  startLinking: (fromId: string) => void;
  cancelLinking: () => void;
  setExploreRoot: (id: string | null) => void;
  setExploreDepth: (depth: number) => void;
  toggleCluster: (clusterId: string) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  pushToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileSheetOpen: (open: boolean) => void;
  setPointerMode: (mode: UIState['pointerMode']) => void;
}

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

let toastSeq = 0;

export const useUIStore = create<UIState>((set, get) => ({
  viewport: DEFAULT_VIEWPORT,
  selectedNodeId: null,
  hoveredNodeId: null,
  panel: 'none',
  editingNodeId: null,
  pendingLinkFrom: null,
  exploreRootId: null,
  exploreDepth: 2,
  collapsedClusters: [],
  filters: EMPTY_FILTERS,
  toasts: [],
  sidebarOpen: true,
  mobileSheetOpen: false,
  pointerMode: 'idle',

  setViewport: (viewport) => set({ viewport }),
  panBy: (dx, dy) =>
    set((state) => ({ viewport: { ...state.viewport, x: state.viewport.x + dx, y: state.viewport.y + dy } })),
  zoomAt: (clientX, clientY, factor) =>
    set((state) => {
      const { x, y, zoom } = state.viewport;
      const next = Math.min(4, Math.max(0.18, zoom * factor));
      const ratio = next / zoom;
      return {
        viewport: {
          zoom: next,
          x: clientX - (clientX - x) * ratio,
          y: clientY - (clientY - y) * ratio,
        },
      };
    }),
  setZoom: (zoom) =>
    set((state) => ({ viewport: { ...state.viewport, zoom: Math.min(4, Math.max(0.18, zoom)) } })),
  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

  selectNode: (id) =>
    set((state) => ({
      selectedNodeId: id,
      panel: id ? 'node-detail' : state.panel === 'node-detail' ? 'none' : state.panel,
    })),
  setHovered: (id) => set({ hoveredNodeId: id }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: 'none', pendingLinkFrom: null, editingNodeId: null }),
  openEditor: (nodeId) => set({ panel: 'node-editor', editingNodeId: nodeId ?? null }),
  startLinking: (fromId) => set({ pendingLinkFrom: fromId, pointerMode: 'linking' }),
  cancelLinking: () => set({ pendingLinkFrom: null, pointerMode: 'idle' }),
  setExploreRoot: (id) => set({ exploreRootId: id }),
  setExploreDepth: (depth) => set({ exploreDepth: Math.min(3, Math.max(1, depth)) }),
  toggleCluster: (clusterId) =>
    set((state) => ({
      collapsedClusters: state.collapsedClusters.includes(clusterId)
        ? state.collapsedClusters.filter((id) => id !== clusterId)
        : [...state.collapsedClusters, clusterId],
    })),
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: EMPTY_FILTERS }),

  pushToast: (message, tone = 'info') => {
    toastSeq += 1;
    const id = `toast-${toastSeq}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => {
      if (get().toasts.some((toast) => toast.id === id)) {
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
      }
    }, 4200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileSheetOpen: (open) => set({ mobileSheetOpen: open }),
  setPointerMode: (mode) => set({ pointerMode: mode }),
}));