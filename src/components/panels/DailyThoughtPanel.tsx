import { useMemo, useState } from 'react';
import { Flame, Sun, Trash2 } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { Badge, Button, TextArea } from '../ui/primitives';
import { Sheet } from '../ui/Sheet';
import { dateKey, formatDate, thoughtStreak, wordCount } from '../../utils/format';

export function DailyThoughtPanel() {
  const thoughts = useGalaxyStore((s) => s.thoughts);
  const addThought = useGalaxyStore((s) => s.addThought);
  const removeThought = useGalaxyStore((s) => s.removeThought);
  const closePanel = useUIStore((s) => s.closePanel);
  const pushToast = useUIStore((s) => s.pushToast);

  const today = dateKey();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => thoughts.slice().sort((a, b) => b.createdAt - a.createdAt),
    [thoughts],
  );
  const streak = useMemo(() => thoughtStreak(thoughts), [thoughts]);
  const todayThoughts = sorted.filter((thought) => thought.date === today);
  const totalWords = sorted.reduce((sum, thought) => sum + wordCount(thought.content), 0);

  const byDate = useMemo(() => {
    const groups = new Map<string, typeof sorted>();
    for (const thought of sorted) {
      const list = groups.get(thought.date) ?? [];
      list.push(thought);
      groups.set(thought.date, list);
    }
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [sorted]);

  const handleSave = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    await addThought(text, today);
    setSaving(false);
    setDraft('');
    pushToast('灵感已记录', 'success');
  };

  return (
    <Sheet
      title="每日灵感"
      subtitle={`连续记录 ${streak} 天 · 共 ${sorted.length} 条 · ${totalWords} 字`}
      icon={<Sun className="h-4 w-4 text-amber-400" />}
      onClose={closePanel}
      testId="daily-panel"
      footer={
        <Button variant="primary" className="w-full" onClick={handleSave} disabled={saving || !draft.trim()}>
          {saving ? '保存中…' : '记录今天的灵感'}
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: '连续天数', value: streak, icon: <Flame className="h-3 w-3 text-orange-400" /> },
          { label: '总条数', value: sorted.length, icon: <Sun className="h-3 w-3 text-amber-400" /> },
          { label: '今日', value: todayThoughts.length, icon: <Sun className="h-3 w-3 text-sky-400" /> },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1">
              {stat.icon}
              <span className="text-base font-semibold tabular-nums text-slate-100">{stat.value}</span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {formatDate(Date.now())} · 今天的灵感
        </p>
        <TextArea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void handleSave();
          }}
          rows={3}
          placeholder="今天的一个念头…（Ctrl/⌘ + Enter 保存）"
          className="font-sans text-xs"
          data-testid="daily-input"
        />
      </div>

      <div className="space-y-3">
        {byDate.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[11px] text-slate-500">
            还没有灵感记录。每天一条，慢慢连成你的时间轨迹。
          </p>
        ) : (
          byDate.map(([date, list]) => (
            <div key={date}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[10px] font-medium text-slate-500">{date}</span>
                <span className="h-px flex-1 bg-white/[0.07]" />
              </div>
              <ul className="space-y-1">
                {list.map((thought) => (
                  <li
                    key={thought.id}
                    className="group flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/80" />
                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-300">
                      {thought.content}
                    </p>
                    {thought.id.startsWith('demo-') ? <Badge color="#f59e0b">Demo</Badge> : null}
                    <button
                      type="button"
                      onClick={() => {
                        void removeThought(thought.id);
                        pushToast('已删除', 'success');
                      }}
                      className="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                      aria-label="删除这条灵感"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <p className="mt-4 text-center text-[10px] text-slate-600">
        提示：每日灵感不会创建星球，它们是星系之外的一条独立时间轨迹。
      </p>
    </Sheet>
  );
}