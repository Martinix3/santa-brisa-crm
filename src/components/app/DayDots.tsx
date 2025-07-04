import type { DayContentProps } from 'react-day-picker';
import { COLOR_MAP, MODIFIER_NAMES } from '@/lib/agenda-colors';
import { cn } from '@/lib/utils';

export function DayDots({ date, activeModifiers }: DayContentProps) {
  const dots: string[] = [];

  if (activeModifiers) {
    Object.values(MODIFIER_NAMES).forEach((modifier) => {
      if (activeModifiers[modifier]) {
        dots.push(COLOR_MAP[modifier]);
      }
    });
  }


  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {date.getDate()}
      {dots.length > 0 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-[2px]">
          {dots.map((cls, i) => (
            <span key={i} className={cn("w-1.5 h-1.5 rounded-full", cls)}></span>
          ))}
        </div>
      )}
    </div>
  );
}
