import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/ui';

const toneStyles = {
  info: { cls: 'border-sky-500/30 bg-sky-500/10 text-sky-200', Icon: Info },
  success: { cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200', Icon: CheckCircle2 },
  error: { cls: 'border-rose-500/30 bg-rose-500/10 text-rose-200', Icon: AlertCircle },
};

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
      {toasts.map((toast) => {
        const { cls, Icon } = toneStyles[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className={`animate-fade-in pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md ${cls}`}
          >
            <Icon className="mt-px h-4 w-4 shrink-0" />
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-60 transition hover:opacity-100"
              aria-label="关闭提示"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}