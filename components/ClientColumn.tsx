import React from 'react';
import { VisualSettings, ClientData } from '../types';
import { TrendBadge } from './TrendBadge';
import { ProductRow } from './ProductRow';
import { roundSafe } from '../utils';

interface ClientColumnProps {
    data: ClientData;
    darkMode: boolean;
    settings: VisualSettings;
    highlightedCode: string | null;
}

export const ClientColumn: React.FC<ClientColumnProps> = ({ data, darkMode, settings, highlightedCode }) => {
  const productCount = data.productsArray.length; // Use the processed array, not the map
  const maxRows = settings.maxRowsPerCol;
  const numCols = Math.ceil(productCount / maxRows) || 1;
  const columns = [];
  
  for (let i = 0; i < numCols; i++) {
      columns.push(data.productsArray.slice(i * maxRows, (i + 1) * maxRows));
  }

  // ANCHO FIJO: Forzamos un ancho que el navegador no pueda reducir
  const SINGLE_COL_WIDTH = 450;
  const columnWidth = numCols * SINGLE_COL_WIDTH;

  return (
    <div 
        style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }} 
        className={`flex-none flex flex-col h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}
    >
      <div className={`px-4 py-4 border-b-2 ${darkMode ? 'bg-white/[0.01] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4 overflow-hidden">
                <h3 className={`font-black uppercase tracking-tighter truncate leading-none ${darkMode ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: `${settings.clientNameFontSize}px` }}>
                {data.name}
                </h3>
                <TrendBadge value={data.totalTrend} darkMode={darkMode} fontSize={settings.trendFontSize + 2} />
            </div>
        </div>
        <div className="flex w-full">
             {Array.from({ length: numCols }).map((_, idx) => (
                <div key={idx} style={{ width: `${100/numCols}%` }} className={`flex justify-between items-center px-4 mt-2 opacity-50 font-black uppercase tracking-wider ${idx > 0 ? 'border-l border-white/[0.05]' : ''}`}>
                    <span className="flex-1" style={{ fontSize: `${settings.tableHeaderFontSize}px` }}>Referencia</span>
                    <div className="grid grid-cols-3 gap-2 w-[180px] xl:w-[220px] text-right" style={{ fontSize: `${settings.tableHeaderFontSize}px` }}>
                        <span>Stock</span>
                        <span>Faltante</span>
                        <span>Total</span>
                    </div>
                </div>
             ))}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} style={{ width: `${100/numCols}%` }} className={`flex flex-col p-1 ${colIdx > 0 ? 'border-l border-white/[0.05]' : ''}`}>
            {colProducts.map((p: any) => (
                <ProductRow 
                    key={p.rowId} 
                    p={p} 
                    settings={settings} 
                    darkMode={darkMode} 
                    isHighlighted={highlightedCode ? p.code === highlightedCode : false}
                />
            ))}
            {/* Relleno para mantener alineación vertical si la columna no está llena */}
            {colProducts.length < maxRows && Array.from({ length: maxRows - colProducts.length }).map((_, emptyIdx) => (
              <div key={`empty-${emptyIdx}`} className="py-2.5 px-3 border-b border-transparent opacity-0">.</div>
            ))}
          </div>
        ))}
      </div>
      <div className={`px-8 py-6 mt-auto border-t-2 ${darkMode ? 'bg-red-600/[0.03] border-red-600/20' : 'bg-red-50 border-red-200'}`}>
        <div className={`flex flex-col ${numCols > 1 ? 'items-center text-center' : 'items-start'}`}>
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] leading-none mb-2">TOTAL PEDIDOS</span>
          <span className={`font-black text-red-600 leading-none tabular-nums tracking-tighter ${numCols > 1 ? 'text-8xl' : 'text-7xl xl:text-8xl'}`}>
            {roundSafe(data.total).toLocaleString('es-ES')}
          </span>
        </div>
      </div>
    </div>
  );
};