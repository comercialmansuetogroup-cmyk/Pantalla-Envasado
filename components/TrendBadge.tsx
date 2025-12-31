
import React from 'react';
import { Minus, ArrowUp, ArrowDown } from 'lucide-react';

interface TrendBadgeProps {
    value: number;
    darkMode: boolean;
    fontSize: number;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ value, darkMode, fontSize }) => {
  if (Math.abs(value) < 0.1) {
    return (
      <div className="flex items-center gap-1 font-bold text-slate-500/40" style={{ fontSize: `${fontSize}px` }}>
        <Minus size={fontSize} /> 0%
      </div>
    );
  }
  
  const isUp = value > 0;
  
  return (
    <div className={`flex items-center gap-0.5 font-black px-1.5 py-0.5 rounded-sm ${
      isUp 
        ? 'text-green-500 bg-green-500/10 border border-green-500/20' 
        : 'text-red-500 bg-red-500/10 border border-red-500/20'
    }`} style={{ fontSize: `${fontSize}px` }}>
      {isUp ? <ArrowUp size={fontSize} strokeWidth={4} /> : <ArrowDown size={fontSize} strokeWidth={4} />}
      {Math.abs(Math.round(value))}%
    </div>
  );
};
