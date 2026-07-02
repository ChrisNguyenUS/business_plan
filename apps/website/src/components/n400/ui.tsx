import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 sm:p-8 ${className}`}>
      {children}
    </div>
  );
}

type ProgressBarProps = {
  progress: number;
  colorClass?: string;
  heightClass?: string;
};

export function ProgressBar({
  progress,
  colorClass = 'bg-teal-600',
  heightClass = 'h-2',
}: ProgressBarProps) {
  return (
    <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClass}`}>
      <div
        className={`${heightClass} ${colorClass} rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export const SKILL_DATA = [
  { name: 'Từ vựng', value: 80, color: 'bg-teal-600', text: 'text-teal-600', trend: '+5%' },
  { name: 'Ngữ pháp', value: 65, color: 'bg-orange-500', text: 'text-orange-500', trend: '+4%' },
  { name: 'Đọc hiểu', value: 70, color: 'bg-yellow-500', text: 'text-yellow-500', trend: '+6%' },
  { name: 'Nghe hiểu', value: 75, color: 'bg-purple-600', text: 'text-purple-600', trend: '+7%' },
];
