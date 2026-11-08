import Dexie, { type EntityTable } from 'dexie';
import type { AppSettings, DailyThoughtData, EdgeData, NodeData } from '../utils/types';
import { DEFAULT_SETTINGS } from '../utils/types';

export interface MetaRecord {
  key: string;
  value: unknown;
}

class ThoughtGalaxyDB extends Dexie {
  nodes!: EntityTable<NodeData, 'id'>;
  edges!: EntityTable<EdgeData, 'id'>;
  thoughts!: EntityTable<DailyThoughtData, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;

  constructor() {
    super('thought-galaxy');
    this.version(1).stores({
      nodes: 'id, type, updatedAt, createdAt, *tags',
      edges: 'id, source, target, relation',
      thoughts: 'id, date, createdAt',
      meta: 'key',
    });
  }
}

let instance: ThoughtGalaxyDB | null = null;

export function getDB(): ThoughtGalaxyDB {
  if (!instance) instance = new ThoughtGalaxyDB();
  return instance;
}

/** IndexedDB may be unavailable (private mode / hardened browsers). */
export async function isDBAvailable(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    const db = getDB();
    await db.open();
    return true;
  } catch {
    return false;
  }
}

export const META_KEYS = {
  settings: 'settings',
  seeded: 'seeded',
  onboarded: 'onboarded',
  lastBackup: 'lastBackup',
  schemaVersion: 'schemaVersion',
  demoCleared: 'demoCleared',
} as const;

export async function readMeta<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await getDB().meta.get(key);
    return row ? (row.value as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeMeta(key: string, value: unknown): Promise<void> {
  try {
    await getDB().meta.put({ key, value });
  } catch {
    /* meta persistence is best-effort; UI keeps working from memory */
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const stored = await readMeta<Partial<AppSettings>>(META_KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await writeMeta(META_KEYS.settings, settings);
}