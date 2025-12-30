import React from 'react';
import { Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TrendBadgeProps {
    value: number;
    darkMode: boolean;
    fontSize: number;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ value, darkMode, fontSize }) => {
  if (Math.abs(value) < 0.1) {
    return (
      <div className="flex items-center justify-center font-bold text-slate-400 opacity-50 px-2 py-1" style={{ fontSize: `${fontSize}px` }}>
        <Minus size={fontSize + 2} /> 0%
      </div>
    );
  }
  const isUp = value > 0;
  return (
    <div className={`flex items-center gap-0.5 font-black leading-none rounded-md whitespace-nowrap px-1 py-0.5 ${isUp ? (darkMode ? 'text-green-400 bg-green-500/10' : 'text-green-700 bg-green-100') : (darkMode ? 'text-red-400 bg-red-500/10' : 'text-red-700 bg-red-100')}`} style={{ fontSize: `${fontSize}px` }}>
      {isUp ? <ArrowUpRight size={fontSize + 2} strokeWidth={3} /> : <ArrowDownRight size={fontSize + 2} strokeWidth={3} />}
      {Math.abs(Math.round(value))}%
    </div>
  );
};