import { Command, Keyboard } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { Kbd } from '../ui/primitives';
import { Sheet } from '../ui/Sheet';

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['N'], label: '新建星球' },
  { keys: ['/'], label: '打开搜索' },
  { keys: ['Ctrl', 'K'], label: '命令面板（macOS: ⌘ K）' },
  { keys: ['F'], label: '适配全部星球' },
  { keys: ['E'], label: '探索模式 / 退出' },
  { keys: ['D'], label: '每日灵感' },
  { keys: ['?'], label: '快捷键帮助' },
  { keys: ['Esc'], label: '关闭面板 / 取消关联' },
  { keys: ['Drag'], label: '拖动星球改变位置' },
  { keys: ['Dbl'], label: '双击星球进入编辑' },
  { keys: ['Wheel'], label: '滚轮缩放画布' },
  { keys: ['Pinch'], label: '移动端双指缩放' },
];

export function ShortcutsPanel() {
  const closePanel = useUIStore((s) => s.closePanel);
  return (
    <Sheet
      title="键盘快捷键"
      subtitle="在输入框内输入文字时，快捷键不会触发"
      icon={<Keyboard className="h-4 w-4 text-sky-400" />}
      onClose={closePanel}
      width="sm"
      testId="shortcuts-panel"
    >
      <ul className="space-y-1">
        {SHORTCUTS.map((shortcut) => (
          <li
            key={shortcut.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
          >
            <span className="text-[11px] text-slate-300">{shortcut.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {shortcut.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-600">
        <Command className="mt-0.5 h-3 w-3 shrink-0" />
        所有快捷键都只作用于画布本身；当焦点在输入框、文本域或可编辑区域时会被自动忽略，避免影响正常打字。
      </p>
    </Sheet>
  );
}