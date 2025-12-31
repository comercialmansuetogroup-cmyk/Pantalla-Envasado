
import React from 'react';
import { TrendBadge } from './TrendBadge';
import { Product, VisualSettings } from '../types';

interface ClientColumnProps {
  group: {
    name: string;
    products: Product[];
  };
  darkMode: boolean;
  settings: VisualSettings;
  highlightedCode: string | null;
}

export const ClientColumn: React.FC<ClientColumnProps> = ({ group, darkMode, settings, highlightedCode }) => {
  const totalQty = group.products.reduce((acc, p) => acc + Number(p.qty), 0);
  const totalPending = group.products.reduce((acc, p) => acc + Math.max(0, p.qty - p.stock), 0);
  
  const columns: Product[][] = [];
  for (let i = 0; i < group.products.length; i += settings.maxRowsPerCol) {
    columns.push(group.products.slice(i, i + settings.maxRowsPerCol));
  }

  return (
    <section className="flex-1 min-w-[450px] h-full flex flex-col border-r border-white/5 bg-black/5">
      <div className="p-10 border-b border-white/5 bg-black/20 flex-none">
        <div className="flex items-baseline gap-4">
          <h2 className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          <span className="text-[11px] font-black opacity-20 tracking-widest">— 0%</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className="flex-1 min-w-[420px] border-r border-white/5 last:border-r-0 flex flex-col">
            <div className="grid grid-cols-[1fr_90px_90px_110px] px-8 py-4 border-b border-white/5 bg-white/2">
              <span className="text-[10px] font-black opacity-30 tracking-widest">REFERENCIA</span>
              <span className="text-right text-[10px] font-black opacity-30 tracking-widest">STOCK</span>
              <span className="text-right text-[10px] font-black opacity-30 tracking-widest">FALTA</span>
              <span className="text-right text-[10px] font-black opacity-30 tracking-widest">PEDIDO</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll">
              {colProducts.map((p, pIdx) => {
                const lack = Math.max(0, p.qty - p.stock);
                const isDone = lack <= 0;
                const isHigh = highlightedCode === p.code;

                return (
                  <div key={pIdx} className={`grid grid-cols-[1fr_90px_90px_110px] px-8 py-4 border-b border-white/5 items-center transition-all duration-500 ${isHigh ? 'bg-red-600/30' : isDone ? 'opacity-20 grayscale' : 'hover:bg-white/2'}`}>
                    <div className="flex flex-col min-w-0 pr-6">
                      <div className="flex items-center gap-3">
                        <span className="font-black" style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.code}</span>
                        <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                      </div>
                      <span className="text-[10px] font-bold opacity-30 uppercase truncate mt-0.5" style={{ fontSize: `${settings.nameFontSize}px` }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right font-bold text-slate-400 tabular-nums text-sm">{p.stock}</div>
                    <div className={`text-right font-black tabular-nums text-sm ${lack > 0 ? 'text-orange-500' : 'text-green-500'}`}>
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

      <div className="p-10 border-t border-white/5 bg-black/40 flex-none space-y-6">
        <div className="grid grid-cols-2 gap-8">
           <div>
              <p className="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-2">TOTAL PEDIDOS</p>
              <p className="text-7xl font-black text-red-600 leading-none tracking-tighter tabular-nums">{totalQty}</p>
           </div>
           <div className="flex flex-col justify-end text-right border-l border-white/5 pl-8">
              <div className="mb-2">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">LÍNEAS ÚNICAS</p>
                <p className="text-2xl font-black text-white">{group.products.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">FALTA PRODUCIR</p>
                <p className="text-2xl font-black text-orange-500">{totalPending}</p>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};
