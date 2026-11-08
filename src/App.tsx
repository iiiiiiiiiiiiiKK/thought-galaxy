import { useEffect, useState } from 'react';
import { Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { GalaxyCanvas } from './components/canvas/GalaxyCanvas';
import { TopBar } from './components/ui/TopBar';
import { SideBar } from './components/ui/SideBar';
import { ToastHost } from './components/ui/Toast';
import { NodeDetailPanel } from './components/panels/NodeDetailPanel';
import { NodeEditorPanel } from './components/panels/NodeEditorPanel';
import { SearchPanel } from './components/panels/SearchPanel';
import { CommandPalette } from './components/panels/CommandPalette';
import { ClusterPanel } from './components/panels/ClusterPanel';
import { DailyThoughtPanel } from './components/panels/DailyThoughtPanel';
import { DataPanel } from './components/panels/DataPanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { ShortcutsPanel } from './components/panels/ShortcutsPanel';
import { ExploreBar } from './components/panels/ExploreBar';
import { useGalaxyStore } from './store/galaxy';
import { useUIStore } from './store/ui';
import { useBootstrap, useGalaxyView } from './hooks/useGalaxyData';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const X_URL = 'https://x.com/0xkillcoin';

function LoadingScreen() {
  return (
    <div className="grid h-full place-items-center bg-[#04060b]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative grid h-14 w-14 place-items-center">
          <span className="absolute inset-0 animate-pulse-glow rounded-full bg-sky-500/25 blur-xl" />
          <span className="relative h-4 w-4 rounded-full bg-gradient-to-br from-sky-300 to-blue-600 shadow-[0_0_24px_rgba(96,165,250,0.9)]" />
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          正在点亮你的星系…
        </p>
      </div>
    </div>
  );
}

function StorageWarning({ message }: { message: string }) {
  return (
    <div className="absolute inset-x-3 bottom-20 z-40 md:inset-x-auto md:bottom-24 md:right-6 md:max-w-sm">
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 backdrop-blur-md">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-amber-200">本地存储不可用</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-amber-300/75">
            {message}。当前浏览器的 IndexedDB 被禁用（可能是隐私模式），你的修改不会被保存。建议切换到普通窗口，或使用导出功能备份数据。
          </p>
        </div>
      </div>
    </div>
  );
}

function WelcomeOverlay() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const openEditor = useUIStore((s) => s.openEditor);
  const openPanel = useUIStore((s) => s.openPanel);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem('tg-welcomed');
    if (seen) setDismissed(true);
  }, []);

  if (dismissed || nodes.length > 0) return null;

  const dismiss = () => {
    window.localStorage.setItem('tg-welcomed', '1');
    setDismissed(true);
  };

  return (
    <div className="absolute inset-0 z-20 grid place-items-center px-4">
      <div className="animate-fade-in glass-strong max-w-md rounded-2xl p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-sky-500/15">
          <Sparkles className="h-5 w-5 text-sky-400" />
        </div>
        <h2 className="text-base font-semibold text-slate-100">你的思绪，自成宇宙</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          星系还是空的。创建第一颗星球，或用导入功能带回你的旧笔记。所有内容都保存在这台设备的浏览器里。
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              dismiss();
              openEditor();
            }}
            className="h-9 rounded-lg bg-sky-500 text-xs font-medium text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
          >
            创建第一颗星球
          </button>
          <button
            type="button"
            onClick={() => {
              dismiss();
              openPanel('data');
            }}
            className="h-9 rounded-lg border border-white/10 bg-white/[0.05] text-xs text-slate-300 transition hover:bg-white/10"
          >
            导入已有笔记
          </button>
        </div>
        <p className="mt-4 text-[10px] text-slate-600">
          提示：按 <kbd className="rounded border border-white/15 px-1 font-mono text-[9px]">N</kbd> 新建，
          按 <kbd className="rounded border border-white/15 px-1 font-mono text-[9px]">?</kbd> 查看快捷键
        </p>
      </div>
    </div>
  );
}

function PanelHost() {
  const panel = useUIStore((s) => s.panel);
  switch (panel) {
    case 'node-detail':
      return <NodeDetailPanel />;
    case 'node-editor':
      return <NodeEditorPanel />;
    case 'search':
      return <SearchPanel />;
    case 'command':
      return <CommandPalette />;
    case 'clusters':
      return <ClusterPanel />;
    case 'daily':
      return <DailyThoughtPanel />;
    case 'data':
      return <DataPanel />;
    case 'settings':
      return <SettingsPanel />;
    case 'shortcuts':
      return <ShortcutsPanel />;
    default:
      return null;
  }
}

function AuthorCredit() {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="pointer-events-auto fixed bottom-[4.6rem] left-3 z-20 hidden items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-500 backdrop-blur-md transition hover:text-slate-200 md:bottom-4 md:flex"
      title="作者 𝕏"
    >
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      @0xkillcoin
    </a>
  );
}

export default function App() {
  const { ready, storageError, dbChecked, dbAvailable } = useBootstrap();
  const { visibleNodeIds, exploreIds, linkedIds } = useGalaxyView();
  useKeyboardShortcuts();

  if (!dbChecked || !ready) return <LoadingScreen />;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#04060b]">
      <SideBar />
      <main className="relative min-w-0 flex-1">
        <GalaxyCanvas exploreIds={exploreIds} linkedIds={linkedIds} visibleNodeIds={visibleNodeIds} />
        <TopBar visibleNodeIds={visibleNodeIds} />
        <ExploreBar />
        <WelcomeOverlay />
        <AuthorCredit />
        {!dbAvailable ? <StorageWarning message={storageError ?? 'IndexedDB 不可用'} /> : null}
      </main>
      <PanelHost />
      <ToastHost />
    </div>
  );
}