import { cn } from '@/lib/utils';

interface ResultBannerProps {
  kind: 'ok' | 'bad';
  title: string;
  sub?: string;
}

export function ResultBanner({ kind, title, sub }: ResultBannerProps) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        kind === 'ok' ? 'border-emerald-600/30 bg-emerald-50 text-emerald-900' : 'border-red-600/30 bg-red-50 text-red-900',
      )}
    >
      <div className="font-medium">{title}</div>
      {sub && <div className="mt-0.5 text-xs opacity-80">{sub}</div>}
    </div>
  );
}
