import { useState } from 'react';
import { Check, Database, Palette, Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { Button, Field, SectionTitle } from '../ui/primitives';
import { Sheet } from '../ui/Sheet';
import type { AppSettings } from '../../utils/types';

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-slate-200">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${
          checked ? 'bg-sky-500' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? 'left-[1.15rem]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export function SettingsPanel() {
  const settings = useGalaxyStore((s) => s.settings);
  const updateSettings = useGalaxyStore((s) => s.updateSettings);
  const resetAll = useGalaxyStore((s) => s.resetAll);
  const nodes = useGalaxyStore((s) => s.nodes);
  const closePanel = useUIStore((s) => s.closePanel);
  const pushToast = useUIStore((s) => s.pushToast);
  const [confirmReset, setConfirmReset] = useState(false);

  const patch = (value: Partial<AppSettings>) => {
    void updateSettings(value);
  };

  return (
    <Sheet
      title="设置"
      subtitle={`本地数据 · ${nodes.length} 颗星球`}
      icon={<Sparkles className="h-4 w-4 text-sky-400" />}
      onClose={closePanel}
      testId="settings-panel"
    >
      <SectionTitle>画布渲染</SectionTitle>
      <div className="mb-4 space-y-1.5">
        <Field label="渲染质量" hint="星球数量很多时调低可以明显提升帧率。">
          <div className="flex gap-1.5">
            {(['high', 'medium', 'low'] as const).map((quality) => (
              <button
                key={quality}
                type="button"
                onClick={() => patch({ canvasQuality: quality })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] transition ${
                  settings.canvasQuality === quality
                    ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                    : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'
                }`}
              >
                {quality === 'high' ? '高' : quality === 'medium' ? '中' : '低'}
              </button>
            ))}
          </div>
        </Field>
        <Toggle
          label="显示星球名称"
          description="缩放较小时自动隐藏，避免文字重叠。"
          checked={settings.showLabels}
          onChange={(value) => patch({ showLabels: value })}
        />
        <Toggle
          label="显示参考网格"
          description="淡色星图网格，帮助判断画布位置。"
          checked={settings.showOrbits}
          onChange={(value) => patch({ showOrbits: value })}
        />
        <Toggle
          label="自动星群"
          description="根据标签与关联规则自动把星球组织成主题星群。"
          checked={settings.autoCluster}
          onChange={(value) => patch({ autoCluster: value })}
        />
      </div>

      <SectionTitle>数据与隐私</SectionTitle>
      <div className="mb-4 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        <div className="flex items-start gap-2">
          <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p className="text-[10px] leading-relaxed text-slate-400">
            所有星球、关联与灵感都保存在浏览器本地 IndexedDB 中，不上传到任何服务器，也不需要账号。清除浏览器数据会同时清除星系，请定期在「数据」面板导出备份。
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Check className="h-3 w-3 text-emerald-400" />
          无第三方分析脚本 · 无遥测 · 无广告
        </div>
      </div>

      <SectionTitle>危险操作</SectionTitle>
      <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-3">
        <div className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-rose-200">清空整个星系</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-rose-300/70">
              会删除全部 {nodes.length} 颗星球、所有关联与灵感记录，且无法撤销。请先导出备份。
            </p>
          </div>
        </div>
        {confirmReset ? (
          <div className="mt-2.5 flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                await resetAll();
                setConfirmReset(false);
                pushToast('星系已清空', 'success');
                closePanel();
              }}
            >
              <Trash2 className="h-3 w-3" /> 确认清空
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
              取消
            </Button>
          </div>
        ) : (
          <Button variant="danger" size="sm" className="mt-2.5" onClick={() => setConfirmReset(true)}>
            <Trash2 className="h-3 w-3" /> 清空星系
          </Button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-600">
        <Palette className="h-3 w-3" />
        Thought Galaxy v1.0 · MIT License
      </div>
    </Sheet>
  );
}