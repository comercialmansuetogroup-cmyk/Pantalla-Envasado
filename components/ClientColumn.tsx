
import React from 'react';
import { TrendBadge } from './TrendBadge';
import { Product, VisualSettings } from '../types';

interface ClientColumnProps {
  group: {
    name: string;
    code?: string;
    products: Product[];
  };
  darkMode: boolean;
  settings: VisualSettings;
  highlightedCode: string | null;
}

export const ClientColumn: React.FC<ClientColumnProps> = ({ group, darkMode, settings, highlightedCode }) => {
  const totalQty = group.products.reduce((acc, p) => acc + Number(p.qty), 0);
  
  // Dividir en subcolumnas según settings
  const columns: Product[][] = [];
  for (let i = 0; i < group.products.length; i += settings.maxRowsPerCol) {
    columns.push(group.products.slice(i, i + settings.maxRowsPerCol));
  }

  return (
    <section className="flex-1 min-w-[420px] h-full flex flex-col border-r border-white/5 bg-black/5">
      {/* Header Cliente */}
      <div className="p-8 border-b border-white/5 bg-black/20 flex-none">
        <div className="flex items-baseline gap-4">
          <h2 className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          <span className="text-[10px] font-black opacity-20 tracking-widest">— 0%</span>
        </div>
      </div>

      {/* Sub-columnas de productos */}
      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className="flex-1 min-w-[400px] border-r border-white/5 last:border-r-0 flex flex-col">
            <div className="grid grid-cols-[1fr_80px_80px_100px] p-header px-6 py-3 border-b border-white/5 bg-white/2">
              <span className="text-[9px] font-black opacity-30 tracking-widest">REFERENCIA</span>
              <span className="text-right text-[9px] font-black opacity-30 tracking-widest">STOCK</span>
              <span className="text-right text-[9px] font-black opacity-30 tracking-widest">FALTA</span>
              <span className="text-right text-[9px] font-black opacity-30 tracking-widest">PEDIDO</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll">
              {colProducts.map((p, pIdx) => {
                const lack = Math.max(0, p.qty - p.stock);
                const isDone = lack <= 0;
                const isHigh = highlightedCode === p.code;

                return (
                  <div 
                    key={pIdx} 
                    className={`grid grid-cols-[1fr_80px_80px_100px] px-6 py-3 border-b border-white/5 items-center transition-all duration-500 ${
                      isHigh ? 'bg-red-600/20' : isDone ? 'opacity-20 grayscale' : 'hover:bg-white/2'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black" style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.code}</span>
                        <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                      </div>
                      <span className="text-[10px] font-bold opacity-30 uppercase truncate" style={{ fontSize: `${settings.nameFontSize}px` }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right font-bold text-slate-400 tabular-nums">{p.stock}</div>
                    <div className={`text-right font-black tabular-nums ${lack > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {isDone ? 'OK' : lack}
                    </div>
                    <div className="text-right font-black text-3xl tracking-tighter tabular-nums leading-none">
                      {p.qty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Cliente */}
      <div className="p-8 border-t border-white/5 bg-black/40 flex-none">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Total Pedidos</p>
            <p className="text-6xl font-black text-red-600 leading-none mt-1 tracking-tighter tabular-nums">{totalQty}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Líneas</p>
             <p className="text-3xl font-black leading-none">{group.products.length}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
