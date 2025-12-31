
import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TrendBadgeProps {
    value: number;
    darkMode: boolean;
    fontSize: number;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ value, darkMode, fontSize }) => {
  if (Math.abs(value) < 0.1) {
    return (
      <div className="flex items-center gap-1 font-bold text-slate-500/30" style={{ fontSize: `${fontSize}px` }}>
        <Minus size={fontSize} strokeWidth={4} /> 0%
      </div>
    );
  }
  
  const isUp = value > 0;
  
  return (
    <div className={`flex items-center gap-1 font-black px-2 py-1 rounded-sm border ${
      isUp 
        ? 'text-green-500 bg-green-500/10 border-green-500/20' 
        : 'text-red-500 bg-red-500/10 border-red-500/20'
    }`} style={{ fontSize: `${fontSize}px` }}>
      {isUp ? <ArrowUp size={fontSize} strokeWidth={4} /> : <ArrowDown size={fontSize} strokeWidth={4} />}
      {Math.abs(Math.round(value))}%
    </div>
  );
};
