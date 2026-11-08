import { useCallback, useEffect } from 'react';
import { useGalaxyStore } from '../store/galaxy';
import { useUIStore } from '../store/ui';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return target.closest('[contenteditable="true"]') !== null;
};

/**
 * Global keyboard shortcuts.
 *
 * Every handler bails out when the event originates inside an editable element,
 * so typing "n" in a note never opens the editor.
 */
export function useKeyboardShortcuts() {
  const openEditor = useUIStore((s) => s.openEditor);
  const openPanel = useUIStore((s) => s.openPanel);
  const closePanel = useUIStore((s) => s.closePanel);
  const panel = useUIStore((s) => s.panel);
  const resetFilters = useUIStore((s) => s.resetFilters);
  const setExploreRoot = useUIStore((s) => s.setExploreRoot);
  const exploreRootId = useUIStore((s) => s.exploreRootId);
  const cancelLinking = useUIStore((s) => s.cancelLinking);
  const pendingLinkFrom = useUIStore((s) => s.pendingLinkFrom);
  const setViewport = useUIStore((s) => s.setViewport);
  const selectNode = useUIStore((s) => s.selectNode);
  const nodes = useGalaxyStore((s) => s.nodes);

  const handleFitAll = useCallback(() => {
    if (nodes.length === 0) {
      setViewport({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 });
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      const radius = 26 * node.size;
      minX = Math.min(minX, node.x - radius);
      minY = Math.min(minY, node.y - radius);
      maxX = Math.max(maxX, node.x + radius);
      maxY = Math.max(maxY, node.y + radius);
    }
    const padding = 140;
    const scale = Math.min(
      (window.innerWidth - padding * 2) / Math.max(1, maxX - minX),
      (window.innerHeight - padding * 2) / Math.max(1, maxY - minY),
    );
    const zoom = Math.min(4, Math.max(0.18, scale));
    setViewport({
      zoom,
      x: window.innerWidth / 2 - ((minX + maxX) / 2) * zoom,
      y: window.innerHeight / 2 - ((minY + maxY) / 2) * zoom,
    });
  }, [nodes, setViewport]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const withModifier = event.ctrlKey || event.metaKey;

      // Command palette works even from inputs (⌘K / Ctrl+K).
      if (withModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openPanel(panel === 'command' ? 'none' : 'command');
        return;
      }

      if (event.key === 'Escape') {
        if (pendingLinkFrom) {
          cancelLinking();
          return;
        }
        if (panel !== 'none') {
          closePanel();
          return;
        }
        selectNode(null);
        return;
      }

      if (isEditableTarget(event.target) || withModifier || event.altKey) return;

      switch (event.key.toLowerCase()) {
        case 'n':
          event.preventDefault();
          openEditor();
          break;
        case '/':
          event.preventDefault();
          resetFilters();
          openPanel('search');
          break;
        case '?':
          event.preventDefault();
          openPanel('shortcuts');
          break;
        case 'f':
          event.preventDefault();
          handleFitAll();
          break;
        case 'd':
          event.preventDefault();
          openPanel('daily');
          break;
        case 'e':
          event.preventDefault();
          setExploreRoot(exploreRootId ? null : nodes[0]?.id ?? null);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    cancelLinking,
    closePanel,
    exploreRootId,
    handleFitAll,
    nodes,
    openEditor,
    openPanel,
    panel,
    pendingLinkFrom,
    resetFilters,
    selectNode,
    setExploreRoot,
  ]);
}