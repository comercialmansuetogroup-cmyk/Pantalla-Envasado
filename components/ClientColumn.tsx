
import React from 'react';
import { TrendBadge } from './TrendBadge';
import { Product, VisualSettings } from '../types';
import { Hash, Boxes, AlertTriangle, ChevronRight } from 'lucide-react';

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
  const totalStock = group.products.reduce((acc, p) => acc + Number(p.stock), 0);
  const totalPending = group.products.reduce((acc, p) => acc + Math.max(0, p.qty - p.stock), 0);
  
  const columns: Product[][] = [];
  for (let i = 0; i < group.products.length; i += settings.maxRowsPerCol) {
    columns.push(group.products.slice(i, i + settings.maxRowsPerCol));
  }

  return (
    <section className="flex-1 min-w-[650px] h-full flex flex-col border-r border-white/5 bg-[#0c0e14]">
      {/* Header Cliente */}
      <div className="p-14 border-b border-white/5 bg-black/40 flex-none">
        <div className="flex items-baseline gap-8">
          <h2 className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          <span className="text-[16px] font-black opacity-20 tracking-[0.5em] text-red-600">PHASE_SYNC</span>
        </div>
      </div>

      {/* Tabla de Productos con Espaciado Potente */}
      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className="flex-1 min-w-[600px] border-r border-white/5 last:border-r-0 flex flex-col">
            <div className="grid grid-cols-[1fr_140px_140px_160px] px-14 py-8 border-b border-white/10 bg-white/2">
              <span className="text-[13px] font-black opacity-40 tracking-[0.2em] uppercase">Referencia</span>
              <span className="text-right text-[13px] font-black opacity-40 tracking-[0.2em] uppercase">En Stock</span>
              <span className="text-right text-[13px] font-black opacity-40 tracking-[0.2em] uppercase">Faltante</span>
              <span className="text-right text-[13px] font-black opacity-40 tracking-[0.2em] uppercase text-red-600">Pedido</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll bg-black/10">
              {colProducts.map((p, pIdx) => {
                const lack = Math.max(0, p.qty - p.stock);
                const isDone = lack <= 0;
                const isHigh = highlightedCode === p.code;

                return (
                  <div key={pIdx} className={`grid grid-cols-[1fr_140px_140px_160px] px-14 py-8 border-b border-white/5 items-center transition-all duration-500 ${isHigh ? 'bg-red-600/60 scale-[1.02] z-10 shadow-2xl' : isDone ? 'opacity-20 grayscale' : 'hover:bg-white/2'}`}>
                    <div className="flex flex-col min-w-0 pr-12">
                      <div className="flex items-center gap-6">
                        <span className="font-black" style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.code}</span>
                        <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                      </div>
                      <span className="text-[14px] font-bold opacity-30 uppercase truncate mt-2" style={{ fontSize: `${settings.nameFontSize}px` }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right font-bold text-slate-400 tabular-nums text-xl">{p.stock}</div>
                    <div className={`text-right font-black tabular-nums text-xl ${lack > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {isDone ? 'OK' : lack}
                    </div>
                    <div className="text-right font-black text-6xl tracking-tighter tabular-nums leading-none text-white drop-shadow-md">
                      {p.qty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER - Títulos Blancos y KPIs Masivos */}
      <div className="p-16 border-t border-white/10 bg-[#080a0f] flex-none shadow-[0_-30px_60px_rgba(0,0,0,0.7)]">
        <div className="grid grid-cols-[1.4fr_1fr] gap-16">
           <div className="space-y-6">
              <p className="text-[28px] font-black text-white uppercase tracking-[0.5em] leading-none mb-4 italic">TOTAL PEDIDOS</p>
              <div className="flex items-end gap-6">
                <p className="text-[130px] font-black text-red-600 leading-none tracking-tighter tabular-nums drop-shadow-[0_0_25px_rgba(220,38,38,0.4)]">
                  {totalQty.toLocaleString()}
                </p>
                <div className="flex flex-col mb-5">
                  <span className="text-[14px] font-black text-white/30 uppercase tracking-[0.3em]">Unidades</span>
                  <div className="w-16 h-2 bg-red-600 mt-2"></div>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-y-12 border-l border-white/10 pl-16 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-[18px] font-black text-white uppercase tracking-widest flex items-center gap-4">
                    <Hash size={24} className="text-red-600" /> PRODUCTOS ÚNICOS
                  </p>
                  <p className="text-5xl font-black text-white tabular-nums">{group.products.length}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-[18px] font-black text-white uppercase tracking-widest flex items-center gap-4">
                    <Boxes size={24} className="text-blue-500" /> STOCK DISPONIBLE
                  </p>
                  <p className="text-5xl font-black text-blue-500 tabular-nums">{totalStock.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-[18px] font-black text-white uppercase tracking-widest flex items-center gap-4">
                    <AlertTriangle size={24} className="text-orange-500" /> PENDIENTE PRODUCIR
                  </p>
                  <p className="text-5xl font-black text-orange-500 tabular-nums">{totalPending.toLocaleString()}</p>
                </div>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};
