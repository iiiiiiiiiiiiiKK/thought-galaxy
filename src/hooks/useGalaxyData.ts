import { useEffect, useMemo, useState } from 'react';
import { useGalaxyStore } from '../store/galaxy';
import { useUIStore } from '../store/ui';
import { matchesFilters, exploreFrom } from '../utils/search';
import { computeClusters } from '../utils/clusters';
import { isDBAvailable } from '../database/db';

/** Boots IndexedDB, seeds the demo galaxy on first visit. */
export function useBootstrap() {
  const hydrate = useGalaxyStore((s) => s.hydrate);
  const seedIfFirstRun = useGalaxyStore((s) => s.seedIfFirstRun);
  const ready = useGalaxyStore((s) => s.ready);
  const storageError = useGalaxyStore((s) => s.storageError);
  const [dbChecked, setDbChecked] = useState(false);
  const [dbAvailable, setDbAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await isDBAvailable();
      if (cancelled) return;
      setDbAvailable(available);
      setDbChecked(true);
      if (available) {
        await hydrate();
        await seedIfFirstRun();
      } else {
        await hydrate();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate, seedIfFirstRun]);

  return { ready, storageError, dbChecked, dbAvailable };
}

/** Derives the filtered node set plus explore/link highlights. */
export function useGalaxyView() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const edges = useGalaxyStore((s) => s.edges);
  const settings = useGalaxyStore((s) => s.settings);
  const filters = useUIStore((s) => s.filters);
  const exploreRootId = useUIStore((s) => s.exploreRootId);
  const exploreDepth = useUIStore((s) => s.exploreDepth);
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);

  const clusters = useMemo(
    () => (settings.autoCluster ? computeClusters({ nodes, edges }) : []),
    [nodes, edges, settings.autoCluster],
  );

  const clusterOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const cluster of clusters) for (const id of cluster.nodeIds) map.set(id, cluster.id);
    return (id: string) => map.get(id) ?? null;
  }, [clusters]);

  const filtered = useMemo(() => {
    const hasFilters =
      filters.types.length > 0 ||
      filters.tags.length > 0 ||
      filters.createdWithinDays !== null ||
      filters.favoriteOnly ||
      filters.query.trim().length > 0;

    if (!hasFilters) return null;

    const query = filters.query.trim().toLowerCase();
    return new Set(
      nodes
        .filter((node) => matchesFilters(node, filters))
        .filter((node) => {
          if (!query) return true;
          return (
            node.title.toLowerCase().includes(query) ||
            node.body.toLowerCase().includes(query) ||
            node.tags.some((tag) => tag.toLowerCase().includes(query)) ||
            node.type.includes(query)
          );
        })
        .map((node) => node.id),
    );
  }, [nodes, filters]);

  const explore = useMemo(() => {
    if (!exploreRootId) return null;
    if (!nodes.some((node) => node.id === exploreRootId)) return null;
    return exploreFrom(exploreRootId, nodes, edges, exploreDepth, clusterOf);
  }, [exploreRootId, exploreDepth, nodes, edges, clusterOf]);

  const exploreIds = useMemo(() => {
    if (!explore) return null;
    return new Set(explore.nodes.map((node) => node.id));
  }, [explore]);

  const linkedIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const ids = new Set<string>([selectedNodeId]);
    for (const edge of edges) {
      if (edge.source === selectedNodeId) ids.add(edge.target);
      if (edge.target === selectedNodeId) ids.add(edge.source);
    }
    return ids;
  }, [selectedNodeId, edges]);

  // Filters hide nodes; explore narrows further when active.
  const visibleNodeIds = useMemo(() => {
    if (filtered && exploreIds) {
      return new Set([...filtered].filter((id) => exploreIds.has(id)));
    }
    return filtered ?? exploreIds;
  }, [filtered, exploreIds]);

  return { clusters, clusterOf, filtered, explore, exploreIds, linkedIds, visibleNodeIds };
}