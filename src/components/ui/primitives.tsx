import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from 'react';

export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60';
  const variants = {
    default: 'border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] hover:text-white',
    primary: 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400',
    ghost: 'text-slate-400 hover:bg-white/[0.08] hover:text-white',
    danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
  };
  const sizes = { sm: 'h-8 px-2.5 text-[11px]', md: 'h-9 px-3.5 text-xs' };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="text-rose-400">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/40';

export function TextInput({ ref, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={`${inputBase} ${className}`} {...rest} />;
}

export function TextArea({ ref, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={`${inputBase} resize-y font-mono leading-relaxed ${className}`} {...rest} />;
}

export function Badge({ children, color, className = '' }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}
      style={
        color
          ? { borderColor: `${color}55`, backgroundColor: `${color}1a`, color }
          : { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }
      }
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-500">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</h3>
      {action}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
      {children}
    </kbd>
  );
}