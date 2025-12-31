
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
    <section className="flex-1 min-w-[550px] h-full flex flex-col border-r border-white/5 bg-[#0c0e14]">
      {/* Header Cliente */}
      <div className="p-14 border-b border-white/5 bg-black/40 flex-none">
        <div className="flex items-baseline gap-6">
          <h2 className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          <span className="text-[14px] font-black opacity-20 tracking-[0.4em]">SINC 100%</span>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className="flex-1 min-w-[500px] border-r border-white/5 last:border-r-0 flex flex-col">
            <div className="grid grid-cols-[1fr_110px_110px_140px] px-12 py-6 border-b border-white/5 bg-white/2">
              <span className="text-[12px] font-black opacity-50 tracking-widest uppercase">Referencia</span>
              <span className="text-right text-[12px] font-black opacity-50 tracking-widest uppercase">Stock</span>
              <span className="text-right text-[12px] font-black opacity-50 tracking-widest uppercase">Falta</span>
              <span className="text-right text-[12px] font-black opacity-50 tracking-widest uppercase text-red-600">Pedido</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll bg-black/5">
              {colProducts.map((p, pIdx) => {
                const lack = Math.max(0, p.qty - p.stock);
                const isDone = lack <= 0;
                const isHigh = highlightedCode === p.code;

                return (
                  <div key={pIdx} className={`grid grid-cols-[1fr_110px_110px_140px] px-12 py-6 border-b border-white/5 items-center transition-all duration-500 ${isHigh ? 'bg-red-600/50 scale-[1.01] z-10' : isDone ? 'opacity-20 grayscale' : 'hover:bg-white/2'}`}>
                    <div className="flex flex-col min-w-0 pr-10">
                      <div className="flex items-center gap-4">
                        <span className="font-black" style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.code}</span>
                        <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                      </div>
                      <span className="text-[12px] font-bold opacity-30 uppercase truncate mt-2" style={{ fontSize: `${settings.nameFontSize}px` }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right font-bold text-slate-400 tabular-nums text-lg">{p.stock}</div>
                    <div className={`text-right font-black tabular-nums text-lg ${lack > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {isDone ? 'OK' : lack}
                    </div>
                    <div className="text-right font-black text-5xl tracking-tighter tabular-nums leading-none text-white">
                      {p.qty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER DEL CLIENTE - REDISEÑO TOTAL */}
      <div className="p-14 border-t border-white/10 bg-[#080a0f] flex-none shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
        <div className="grid grid-cols-[1.5fr_1fr] gap-12">
           {/* KPI Principal Izquierda */}
           <div className="space-y-4">
              <p className="text-[24px] font-black text-white uppercase tracking-[0.4em] leading-none mb-4 italic">TOTAL PEDIDOS</p>
              <div className="flex items-end gap-5">
                <p className="text-[110px] font-black text-red-600 leading-none tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                  {totalQty.toLocaleString()}
                </p>
                <div className="flex flex-col mb-4">
                  <span className="text-[12px] font-black text-white/20 uppercase tracking-widest">Unidades</span>
                  <div className="w-12 h-1 bg-red-600 mt-1"></div>
                </div>
              </div>
           </div>

           {/* KPIs Secundarios Derecha */}
           <div className="grid grid-cols-1 gap-y-10 border-l border-white/10 pl-12 py-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[16px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <Hash size={18} className="text-red-600" /> LÍNEAS ÚNICAS
                  </p>
                  <p className="text-4xl font-black text-white/90 tabular-nums">{group.products.length}</p>
                </div>
                <ChevronRight className="opacity-10" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[16px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <Boxes size={18} className="text-blue-500" /> STOCK ASIGNADO
                  </p>
                  <p className="text-4xl font-black text-blue-500 tabular-nums">{totalStock.toLocaleString()}</p>
                </div>
                <ChevronRight className="opacity-10" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[16px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <AlertTriangle size={18} className="text-orange-500" /> FALTA PRODUCIR
                  </p>
                  <p className="text-4xl font-black text-orange-500 tabular-nums">{totalPending.toLocaleString()}</p>
                </div>
                <ChevronRight className="opacity-10" />
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};
