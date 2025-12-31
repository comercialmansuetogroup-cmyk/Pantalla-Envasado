
import React from 'react';
import { TrendBadge } from './TrendBadge';
import { Product, VisualSettings } from '../types';
import { Hash, Boxes, AlertTriangle } from 'lucide-react';

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
    <section className={`flex-1 min-w-[650px] h-full flex flex-col border-r transition-colors duration-300 ${darkMode ? 'border-white/5 bg-[#0c0e14]' : 'border-slate-300 bg-white'}`}>
      
      {/* Header Cliente */}
      <div className={`p-14 border-b flex-none ${darkMode ? 'border-white/5 bg-black/40' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-baseline gap-8">
          <h2 className={`font-black uppercase tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          {/* Aplicar tamaño de fuente configurable al % de cliente */}
          <span className="font-black opacity-30 tracking-[0.5em] text-red-600" style={{ fontSize: `${settings.clientTrendFontSize}px` }}>
             — 0%
          </span>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className={`flex-1 min-w-[600px] border-r last:border-r-0 flex flex-col ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
            
            {/* Cabecera Tabla */}
            <div className={`grid grid-cols-[1fr_140px_140px_160px] px-14 py-8 border-b ${darkMode ? 'border-white/10 bg-white/2' : 'border-slate-200 bg-slate-100'}`}>
              <span className={`text-[13px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Referencia</span>
              <span className={`text-right text-[13px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Stock</span>
              <span className={`text-right text-[13px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Faltante</span>
              <span className="text-right text-[13px] font-black opacity-40 tracking-[0.2em] uppercase text-red-600">Pedido</span>
            </div>
            
            <div className={`flex-1 overflow-y-auto custom-scroll ${darkMode ? 'bg-black/10' : 'bg-white'}`}>
              {colProducts.map((p, pIdx) => {
                const lack = Math.max(0, p.qty - p.stock);
                const isDone = lack <= 0;
                const isHigh = highlightedCode === p.code;

                return (
                  <div key={pIdx} className={`grid grid-cols-[1fr_140px_140px_160px] px-14 py-8 border-b items-center transition-all duration-500 
                    ${darkMode ? 'border-white/5' : 'border-slate-100'}
                    ${isHigh ? 'bg-red-600/60 scale-[1.02] z-10 shadow-2xl' : isDone ? 'opacity-20 grayscale' : (darkMode ? 'hover:bg-white/2' : 'hover:bg-slate-50')}
                  `}>
                    <div className="flex flex-col min-w-0 pr-12">
                      <div className="flex items-center gap-6">
                        <span className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.code}</span>
                        {/* Pasar el fontSize configurado al Badge */}
                        <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                      </div>
                      <span className={`font-bold opacity-40 uppercase truncate mt-2 ${darkMode ? 'text-white' : 'text-slate-500'}`} style={{ fontSize: `${settings.nameFontSize}px` }}>
                        {p.name}
                      </span>
                    </div>
                    
                    <div className={`text-right font-bold tabular-nums text-xl ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.stock}</div>
                    
                    <div className={`text-right font-black tabular-nums text-xl ${lack > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                      {isDone ? 'OK' : lack}
                    </div>
                    
                    <div className={`text-right font-black text-6xl tracking-tighter tabular-nums leading-none drop-shadow-md ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {p.qty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Totales */}
      <div className={`p-16 border-t flex-none shadow-[0_-30px_60px_rgba(0,0,0,0.1)] ${darkMode ? 'border-white/10 bg-[#080a0f]' : 'border-slate-200 bg-white'}`}>
        <div className="grid grid-cols-[1.4fr_1fr] gap-16">
           <div className="space-y-6">
              <p className={`text-[28px] font-black uppercase tracking-[0.5em] leading-none mb-4 italic ${darkMode ? 'text-white' : 'text-slate-900'}`}>TOTAL PEDIDOS</p>
              <div className="flex items-end gap-6">
                <p className="text-[130px] font-black text-red-600 leading-none tracking-tighter tabular-nums drop-shadow-[0_0_25px_rgba(220,38,38,0.4)]">
                  {totalQty.toLocaleString()}
                </p>
                <div className="flex flex-col mb-5">
                  <span className={`text-[14px] font-black uppercase tracking-[0.3em] ${darkMode ? 'text-white/30' : 'text-slate-400'}`}>Unidades</span>
                  <div className="w-16 h-2 bg-red-600 mt-2"></div>
                </div>
              </div>
           </div>

           <div className={`grid grid-cols-1 gap-y-12 border-l pl-16 py-4 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className={`text-[18px] font-black uppercase tracking-widest flex items-center gap-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Hash size={24} className="text-red-600" /> PRODUCTOS ÚNICOS
                  </p>
                  <p className={`text-5xl font-black tabular-nums ${darkMode ? 'text-white' : 'text-slate-800'}`}>{group.products.length}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className={`text-[18px] font-black uppercase tracking-widest flex items-center gap-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Boxes size={24} className="text-blue-500" /> STOCK DISPONIBLE
                  </p>
                  <p className="text-5xl font-black text-blue-500 tabular-nums">{totalStock.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className={`text-[18px] font-black uppercase tracking-widest flex items-center gap-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
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
