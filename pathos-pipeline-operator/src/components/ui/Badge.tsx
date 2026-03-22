import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'slate';
}

const variantClasses: Record<string, string> = {
  default: 'bg-slate-800/60 text-slate-300 border-slate-700/50',
  green: 'bg-green-900/40 text-green-400 border-green-800/50',
  blue: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
  amber: 'bg-amber-900/40 text-amber-400 border-amber-800/50',
  red: 'bg-red-900/40 text-red-400 border-red-800/50',
  purple: 'bg-purple-900/40 text-purple-400 border-purple-800/50',
  slate: 'bg-slate-900/40 text-slate-400 border-slate-700/50',
};

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
