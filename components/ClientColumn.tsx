
import React from 'react';
import { TrendBadge } from './TrendBadge';
import { Product, VisualSettings } from '../types';
import { Package, Hash, Boxes, AlertTriangle } from 'lucide-react';

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
    <section className="flex-1 min-w-[500px] h-full flex flex-col border-r border-white/5 bg-[#0c0e14]">
      {/* Header del Cliente */}
      <div className="p-12 border-b border-white/5 bg-black/30 flex-none">
        <div className="flex items-baseline gap-5">
          <h2 className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          <span className="text-[12px] font-black opacity-20 tracking-[0.3em]">— 0%</span>
        </div>
      </div>

      {/* Cuerpo de la tabla con espaciado ancho */}
      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className="flex-1 min-w-[480px] border-r border-white/5 last:border-r-0 flex flex-col">
            <div className="grid grid-cols-[1fr_100px_100px_130px] px-10 py-5 border-b border-white/5 bg-white/2">
              <span className="text-[11px] font-black opacity-40 tracking-widest">REFERENCIA</span>
              <span className="text-right text-[11px] font-black opacity-40 tracking-widest">STOCK</span>
              <span className="text-right text-[11px] font-black opacity-40 tracking-widest">FALTA</span>
              <span className="text-right text-[11px] font-black opacity-40 tracking-widest">PEDIDO</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll bg-black/10">
              {colProducts.map((p, pIdx) => {
                const lack = Math.max(0, p.qty - p.stock);
                const isDone = lack <= 0;
                const isHigh = highlightedCode === p.code;

                return (
                  <div key={pIdx} className={`grid grid-cols-[1fr_100px_100px_130px] px-10 py-5 border-b border-white/5 items-center transition-all duration-500 ${isHigh ? 'bg-red-600/40' : isDone ? 'opacity-20 grayscale' : 'hover:bg-white/2'}`}>
                    <div className="flex flex-col min-w-0 pr-8">
                      <div className="flex items-center gap-3">
                        <span className="font-black" style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.code}</span>
                        <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                      </div>
                      <span className="text-[12px] font-bold opacity-30 uppercase truncate mt-1" style={{ fontSize: `${settings.nameFontSize}px` }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right font-bold text-slate-500 tabular-nums text-base">{p.stock}</div>
                    <div className={`text-right font-black tabular-nums text-base ${lack > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {isDone ? 'OK' : lack}
                    </div>
                    <div className="text-right font-black text-4xl tracking-tighter tabular-nums leading-none">
                      {p.qty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer del Cliente Brutal */}
      <div className="p-12 border-t border-white/10 bg-black/50 flex-none shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-2 gap-10">
           {/* KPI Principal */}
           <div className="space-y-2">
              <p className="text-[14px] font-black text-white uppercase tracking-[0.3em]">TOTAL PEDIDOS</p>
              <div className="flex items-end gap-3">
                <p className="text-8xl font-black text-red-600 leading-none tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(220,38,38,0.2)]">{totalQty}</p>
                <span className="text-xs font-black opacity-20 mb-2 uppercase tracking-widest">Unidades</span>
              </div>
           </div>

           {/* Resúmenes Secundarios */}
           <div className="grid grid-cols-2 gap-y-8 gap-x-4 border-l border-white/10 pl-10">
              <div className="space-y-1">
                <p className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 opacity-80">
                  <Hash size={12} className="text-red-600" /> PRODUCTOS
                </p>
                <p className="text-3xl font-black text-white">{group.products.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 opacity-80">
                  <Boxes size={12} className="text-blue-500" /> EN STOCK
                </p>
                <p className="text-3xl font-black text-blue-400">{totalStock}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 opacity-80">
                  <AlertTriangle size={12} className="text-orange-500" /> TOTAL FALTANTE POR PRODUCIR
                </p>
                <p className="text-3xl font-black text-orange-500">{totalPending}</p>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};
