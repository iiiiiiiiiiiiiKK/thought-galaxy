import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  testId?: string;
}

const widths = {
  sm: 'md:max-w-md',
  md: 'md:max-w-xl',
  lg: 'md:max-w-3xl',
};

/**
 * Right-side sheet on desktop, bottom sheet on mobile (the mobile pattern is a
 * dedicated layout rather than a shrunken desktop panel).
 */
export function Sheet({ title, subtitle, icon, onClose, children, footer, width = 'md', testId }: SheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className={`animate-fade-in glass-strong fixed z-50 flex flex-col overflow-hidden
          inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl
          md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:rounded-none md:rounded-l-2xl ${widths[width]}`}
      >
        <header className="flex items-start gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
          <div className="mx-auto mb-1 mt-0 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" />
          <div className="hidden md:block">{icon}</div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭"
            data-testid="sheet-close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="scrollbar-hide flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">{children}</div>
        {footer ? <div className="border-t border-white/[0.07] px-4 py-3 md:px-5">{footer}</div> : null}
      </section>
    </>
  );
}