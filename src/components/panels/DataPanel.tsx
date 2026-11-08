import { useRef, useState } from 'react';
import { AlertCircle, Download, FileJson, FileText, Package, Sparkles, Upload } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { Button, SectionTitle } from '../ui/primitives';
import { Sheet } from '../ui/Sheet';
import {
  exportFullZip,
  exportJSON,
  exportMarkdownBundle,
  importFromFiles,
  importFromZip,
} from '../../import-export/io';
import type { ImportResult } from '../../import-export/schema';

export function DataPanel() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const edges = useGalaxyStore((s) => s.edges);
  const thoughts = useGalaxyStore((s) => s.thoughts);
  const clearDemo = useGalaxyStore((s) => s.clearDemo);
  const importSnapshot = useGalaxyStore((s) => s.importSnapshot);
  const closePanel = useUIStore((s) => s.closePanel);
  const pushToast = useUIStore((s) => s.pushToast);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState<string | null>(null);

  const hasDemo = nodes.some((node) => node.isDemo);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const list = Array.from(files);
      const existingIds = new Set(nodes.map((node) => node.id));
      const zip = list.find((file) => /\.zip$/i.test(file.name));
      const result = zip ? await importFromZip(zip, existingIds) : await importFromFiles(list, existingIds);
      setPreview(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导入文件解析失败，请检查文件格式');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const result = await importSnapshot(
        { nodes: preview.nodes, edges: preview.edges, thoughts: preview.thoughts },
        mode,
      );
      pushToast(
        mode === 'replace'
          ? `已替换为 ${result.added} 颗星球`
          : `已导入 ${result.added} 颗星球${result.skipped ? `，跳过 ${result.skipped} 条` : ''}`,
        'success',
      );
      setPreview(null);
      closePanel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '写入数据库失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="数据"
      subtitle={`${nodes.length} 颗星球 · ${edges.length} 条关联 · ${thoughts.length} 条灵感`}
      icon={<Download className="h-4 w-4 text-sky-400" />}
      onClose={closePanel}
      testId="data-panel"
      footer={
        preview ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {(['merge', 'replace'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] transition ${
                    mode === option
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                      : 'border-white/10 text-slate-400 hover:border-white/25'
                  }`}
                >
                  {option === 'merge' ? '合并（推荐）' : '替换现有'}
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={applyImport} disabled={busy}>
              确认导入
            </Button>
          </div>
        ) : null
      }
    >
      <SectionTitle>导出</SectionTitle>
      <div className="mb-4 grid gap-1.5">
        <button
          type="button"
          onClick={() => {
            exportJSON(nodes, edges, thoughts);
            pushToast('已导出完整 JSON', 'success');
          }}
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-sky-500/40 hover:bg-sky-500/[0.06]"
        >
          <FileJson className="h-4 w-4 shrink-0 text-sky-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-slate-200">完整 JSON</span>
            <span className="block text-[10px] text-slate-500">包含星球、关联、灵感、坐标与时间戳</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            exportMarkdownBundle(nodes, edges);
            pushToast('已导出 Markdown 压缩包', 'success');
          }}
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-sky-500/40 hover:bg-sky-500/[0.06]"
        >
          <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-slate-200">Markdown 压缩包</span>
            <span className="block text-[10px] text-slate-500">每颗星球一个 .md 文件 + 索引 + 关联清单</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            exportFullZip(nodes, edges, thoughts);
            pushToast('已导出完整备份 ZIP', 'success');
          }}
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-sky-500/40 hover:bg-sky-500/[0.06]"
        >
          <Package className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-slate-200">完整备份 ZIP</span>
            <span className="block text-[10px] text-slate-500">JSON + Markdown + 灵感 + 关联，可直接再导入</span>
          </span>
        </button>
      </div>

      <SectionTitle>导入</SectionTitle>
      <div className="mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".json,.md,.markdown,.txt,.zip"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
          className="hidden"
          data-testid="import-input"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center transition hover:border-sky-500/50 hover:bg-sky-500/[0.05] disabled:opacity-50"
          data-testid="import-button"
        >
          <Upload className="h-5 w-5 text-slate-400" />
          <span className="text-xs font-medium text-slate-300">{busy ? '解析中…' : '选择文件导入'}</span>
          <span className="text-[10px] text-slate-500">支持 JSON、单个或多个 Markdown、以及完整备份 ZIP</span>
        </button>
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">
          导入前会先解析校验：重复 ID 会自动重新生成，指向不存在星球的关联会被拒绝，任何文件都不会覆盖你已有的数据（除非你选择「替换」）。
        </p>
      </div>

      {error ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
          <p className="text-[11px] text-rose-200">{error}</p>
        </div>
      ) : null}

      {preview ? (
        <div className="mb-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-3">
          <p className="text-[11px] font-medium text-sky-200">解析结果</p>
          <ul className="mt-1.5 space-y-0.5 text-[10px] text-slate-300">
            <li>星球：{preview.nodes.length} 颗</li>
            <li>关联：{preview.edges.length} 条</li>
            <li>灵感：{preview.thoughts.length} 条</li>
            {preview.duplicates.length > 0 ? <li className="text-amber-300">重复 ID：{preview.duplicates.length} 个（已重新生成）</li> : null}
            {preview.skipped > 0 ? <li className="text-amber-300">跳过记录：{preview.skipped} 条</li> : null}
            {preview.invalidEdges.length > 0 ? (
              <li className="text-rose-300">无效关联：{preview.invalidEdges.length} 条</li>
            ) : null}
          </ul>
          {preview.warnings.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] text-slate-400">查看 {preview.warnings.length} 条提示</summary>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-[10px] text-slate-500">
                {preview.warnings.slice(0, 30).map((warning, index) => (
                  <li key={index}>· {warning}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {hasDemo ? (
        <>
          <SectionTitle>示例星系</SectionTitle>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-amber-200">当前星系包含 Demo 内容</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-amber-300/70">
                  Demo 星球带有「Demo」标记，与你的真实内容分开管理。清空后不会影响你自己创建的星球。
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="mt-2.5"
              onClick={async () => {
                await clearDemo();
                pushToast('示例星系已清空，开始构建你的宇宙', 'success');
              }}
              data-testid="clear-demo"
            >
              一键清空 Demo
            </Button>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}