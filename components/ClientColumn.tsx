
import React, { useMemo } from 'react';
import { TrendBadge } from './TrendBadge';
import { Product, VisualSettings } from '../types';
import { Hash, Boxes, AlertTriangle, ArrowUp, ArrowDown, Minus, Check } from 'lucide-react';

interface ClientColumnProps {
  group: {
    name: string;
    products: Product[];
    trend?: number; 
  };
  darkMode: boolean;
  settings: VisualSettings;
  highlightedCode: string | null;
}

export const ClientColumn: React.FC<ClientColumnProps> = ({ group, darkMode, settings, highlightedCode }) => {
  const totalQty = useMemo(() => group.products.reduce((acc, p) => acc + Number(p.qty), 0), [group.products]);
  const totalStock = useMemo(() => group.products.reduce((acc, p) => acc + Number(p.stock), 0), [group.products]);
  const totalPending = useMemo(() => group.products.reduce((acc, p) => acc + Math.max(0, p.qty - p.stock), 0), [group.products]);
  
  const activeProducts = group.products;

  const columns: Product[][] = [];
  for (let i = 0; i < activeProducts.length; i += settings.maxRowsPerCol) {
    columns.push(activeProducts.slice(i, i + settings.maxRowsPerCol));
  }
  
  const isMultiCol = columns.length > 1;
  const calculatedWidth = isMultiCol 
      ? (settings.colWidthMulti || 520) 
      : (settings.colWidthSingle || 340);
  
  const verticalPadding = settings.rowVerticalPadding || 8;

  // Grid Template: [Info (flex), Stock, Pendiente, Total]
  // Ajustado para coincidir con la captura: La primera columna es flexible, las otras fijas y alineadas a la derecha
  const gridTemplate = "grid-cols-[1fr_50px_60px_60px]";
  
  const trendValue = group.trend || 0;
  const isTrendUp = trendValue > 0;
  const isTrendFlat = Math.abs(trendValue) < 0.1;

  // Header Styles
  const headerLabelClass = `text-[9px] font-black uppercase tracking-[0.1em] ${darkMode ? 'text-white/40' : 'text-slate-400'}`;

  return (
    <section 
        className={`h-full flex flex-col border-r transition-colors duration-300 ${darkMode ? 'border-white/5 bg-[#0c0e14]' : 'border-slate-300 bg-white'}`}
        style={{ 
            minWidth: `${calculatedWidth}px`,
            flex: `1 1 ${calculatedWidth}px`
        }}
    >
      
      {/* Header Cliente */}
      <div className={`p-6 border-b flex-none flex flex-col items-center justify-center text-center ${darkMode ? 'border-white/5 bg-black/40' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-black uppercase tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          
          <div className={`flex items-center gap-1 font-black tracking-tight px-3 py-1 rounded-full ${
            isTrendFlat 
              ? (darkMode ? 'bg-white/5 text-white/40' : 'bg-slate-200 text-slate-500')
              : (isTrendUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500')
          }`} style={{ fontSize: `${settings.clientTrendFontSize}px` }}>
             {isTrendFlat ? <Minus size={settings.clientTrendFontSize} /> : (isTrendUp ? <ArrowUp size={settings.clientTrendFontSize} strokeWidth={3} /> : <ArrowDown size={settings.clientTrendFontSize} strokeWidth={3} />)}
             <span>{Math.abs(Math.round(trendValue))}%</span>
          </div>
        </div>
      </div>

      {/* Columnas de Productos */}
      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.length === 0 ? (
           <div className="flex-1 flex items-center justify-center flex-col opacity-20 w-full">
              <span className="text-4xl font-black text-slate-500">NO PEDIDOS</span>
           </div>
        ) : (
          columns.map((colProducts, colIdx) => (
            <div 
                key={colIdx} 
                className={`flex-1 border-r last:border-r-0 flex flex-col ${darkMode ? 'border-white/5' : 'border-slate-200'}`} 
            >
              
              {/* Table Header */}
              <div 
                className={`grid ${gridTemplate} px-4 border-b gap-2 ${darkMode ? 'border-white/10 bg-white/2' : 'border-slate-200 bg-slate-50'}`}
                style={{ paddingTop: '8px', paddingBottom: '8px' }}
               >
                <span className={headerLabelClass}>REFERENCIA</span>
                <span className={`text-right ${headerLabelClass}`}>STOCK</span>
                <span className={`text-right ${headerLabelClass}`}>FALTANTE</span>
                <span className={`text-right ${headerLabelClass}`}>PEDIDO</span>
              </div>
              
              <div className={`flex-1 overflow-y-auto custom-scroll ${darkMode ? 'bg-black/10' : 'bg-white'}`}>
                {colProducts.map((p, pIdx) => {
                  const lack = Math.max(0, p.qty - p.stock);
                  const isCompleted = lack === 0;
                  const isHigh = highlightedCode === p.code;

                  // Configuración de visualización
                  const mode = settings.displayMode; // 'name', 'code', 'both'
                  const showCode = mode === 'code' || mode === 'both';
                  const showName = mode === 'name' || mode === 'both';

                  return (
                    <div 
                        key={pIdx} 
                        className={`grid ${gridTemplate} px-4 border-b items-center gap-2 transition-all duration-500 ${
                            isHigh ? 'bg-green-500 text-white z-10 scale-[1.02] shadow-lg border-green-600' : 
                            (darkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50')
                        }`}
                        style={{ paddingTop: `${verticalPadding}px`, paddingBottom: `${verticalPadding}px` }}
                    >
                      
                      {/* COL 1: Identificación del Producto */}
                      <div className="flex flex-col min-w-0 pr-2">
                         {/* Código (Negrita, Arriba) */}
                         {showCode && (
                           <div className="flex items-center gap-2">
                             <span className={`font-black leading-none ${isHigh ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-800')}`} style={{ fontSize: `${settings.codeFontSize}px` }}>
                               #{p.code}
                             </span>
                             {/* Badge de tendencia al lado del código si solo se muestra código o ambos */}
                             <div className={isHigh ? 'brightness-0 invert' : ''}>
                                <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                             </div>
                           </div>
                         )}
                         
                         {/* Nombre (Gris, Debajo, Más pequeño) */}
                         {showName && (
                           <span className={`font-bold uppercase truncate leading-tight mt-0.5 ${
                               isHigh ? 'text-white/80' : (darkMode ? 'text-white/40' : 'text-slate-400')
                           }`} style={{ fontSize: `${settings.nameFontSize}px` }}>
                              {p.name}
                           </span>
                         )}
                      </div>
                      
                      {/* COL 2: Stock (Azul) */}
                      <div className={`text-right font-bold tabular-nums text-xs ${isHigh ? 'text-white' : (darkMode ? 'text-blue-400' : 'text-blue-600')}`}>
                        {p.stock}
                      </div>
                      
                      {/* COL 3: Faltante (Naranja) */}
                      <div className={`text-right font-black tabular-nums text-sm ${isHigh ? 'text-white' : (isCompleted ? 'text-green-500' : 'text-orange-500')}`}>
                        {lack}
                      </div>
                      
                      {/* COL 4: Pedido Total (Grande, Negro) */}
                      <div className={`text-right font-black tabular-nums leading-none ${isHigh ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-900')}`} style={{ fontSize: '18px' }}>
                        {p.qty}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totales */}
      <div className={`p-6 border-t flex-none ${darkMode ? 'border-white/10 bg-[#080a0f]' : 'border-slate-200 bg-white'}`}>
         <div className="flex justify-center">
            <div className="text-center">
               <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${darkMode ? 'text-white/40' : 'text-slate-400'}`}>TOTAL PEDIDOS</p>
               <p className="text-5xl font-black text-red-600 tracking-tighter tabular-nums">{totalQty.toLocaleString()}</p>
            </div>
         </div>
      </div>
    </section>
  );
};
