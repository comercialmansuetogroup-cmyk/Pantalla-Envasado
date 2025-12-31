
import React, { useMemo } from 'react';
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
  // Solo calculamos una vez
  const totalQty = useMemo(() => group.products.reduce((acc, p) => acc + Number(p.qty), 0), [group.products]);
  const totalStock = useMemo(() => group.products.reduce((acc, p) => acc + Number(p.stock), 0), [group.products]);
  // El cálculo de pendiente es Total - Stock
  const totalPending = useMemo(() => group.products.reduce((acc, p) => acc + Math.max(0, p.qty - p.stock), 0), [group.products]);
  
  // FILTRO MÁGICO: Solo mostrar productos que aún tienen pendiente.
  const activeProducts = useMemo(() => {
    return group.products.filter(p => {
       const lack = p.qty - p.stock;
       return lack > 0;
    });
  }, [group.products]);

  const columns: Product[][] = [];
  for (let i = 0; i < activeProducts.length; i += settings.maxRowsPerCol) {
    columns.push(activeProducts.slice(i, i + settings.maxRowsPerCol));
  }
  
  // Ajuste de Grid: Damos un poco más de espacio a la columna Pendiente (3ra col) porque la fuente será más grande
  const gridTemplate = "grid-cols-[1fr_70px_110px_90px]";

  return (
    <section className={`flex-1 min-w-[520px] h-full flex flex-col border-r transition-colors duration-300 ${darkMode ? 'border-white/5 bg-[#0c0e14]' : 'border-slate-300 bg-white'}`}>
      
      {/* Header Cliente */}
      <div className={`p-6 border-b flex-none ${darkMode ? 'border-white/5 bg-black/40' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-baseline gap-4">
          <h2 className={`font-black uppercase tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          <span className="font-black opacity-30 tracking-[0.3em] text-red-600" style={{ fontSize: `${settings.clientTrendFontSize}px` }}>
             — {activeProducts.length === 0 ? 'COMPLETADO' : 'EN PROCESO'}
          </span>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.length === 0 ? (
           <div className="flex-1 flex items-center justify-center flex-col opacity-20">
              <span className="text-6xl font-black text-slate-500">OK</span>
              <span className="text-sm font-bold uppercase tracking-widest mt-2 text-slate-500">Zona Completada</span>
           </div>
        ) : (
          columns.map((colProducts, colIdx) => (
            <div key={colIdx} className={`flex-1 min-w-[500px] border-r last:border-r-0 flex flex-col ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
              
              {/* Cabecera Tabla */}
              <div className={`grid ${gridTemplate} px-4 py-3 border-b ${darkMode ? 'border-white/10 bg-white/2' : 'border-slate-200 bg-slate-100'}`}>
                <span className={`text-[10px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Referencia</span>
                <span className={`text-right text-[10px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Stock</span>
                <span className={`text-right text-[10px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Pendiente</span>
                <span className="text-right text-[10px] font-black tracking-[0.2em] uppercase text-red-600">Total</span>
              </div>
              
              <div className={`flex-1 overflow-y-auto custom-scroll ${darkMode ? 'bg-black/10' : 'bg-white'}`}>
                {colProducts.map((p, pIdx) => {
                  const lack = Math.max(0, p.qty - p.stock);
                  const isHigh = highlightedCode === p.code;

                  // Lógica de Colores Condicional
                  // Si hay animación (isHigh), TODO texto es BLANCO.
                  // Si no, usa los colores normales (Azul stock, Naranja/Verde pendiente).
                  const textColorBase = isHigh ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-800');
                  const stockColor = isHigh ? 'text-white' : (darkMode ? 'text-blue-400' : 'text-blue-600');
                  const pendingColor = isHigh ? 'text-white' : (lack > 0 ? 'text-orange-500' : 'text-green-600');
                  const totalColor = isHigh ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-900');
                  
                  // Fondo de la fila
                  const rowBg = isHigh 
                    ? 'bg-green-500 shadow-xl z-20 scale-[1.02] border-green-600' // Animación Activada
                    : (darkMode ? 'border-white/5 hover:bg-white/2' : 'border-slate-100 hover:bg-slate-50'); // Estado Normal

                  return (
                    <div key={pIdx} className={`grid ${gridTemplate} px-4 py-3 border-b items-center transition-all duration-500 ease-out ${rowBg}`}>
                      
                      {/* Columna 1: Info Producto */}
                      <div className="flex flex-col min-w-0 pr-4">
                        <div className="flex items-center gap-3">
                          <span className={`font-black ${textColorBase}`} style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.code}</span>
                          {/* El badge también cambia a blanco si está activo para que se vea bien sobre el verde */}
                          <div className={isHigh ? 'brightness-0 invert' : ''}>
                             <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                          </div>
                        </div>
                        <span className={`font-bold opacity-50 uppercase truncate mt-1 ${isHigh ? 'text-white opacity-80' : (darkMode ? 'text-white' : 'text-slate-500')}`} style={{ fontSize: `${settings.nameFontSize}px` }}>
                          {p.name}
                        </span>
                      </div>
                      
                      {/* Columna 2: Stock Realizado */}
                      <div className={`text-right font-bold tabular-nums text-sm ${stockColor}`}>{p.stock}</div>
                      
                      {/* Columna 3: PENDIENTE (Con Zoom) */}
                      {/* Aumentado a text-2xl y añadido scale-125 cuando se activa */}
                      <div className={`text-right font-black tabular-nums tracking-tighter text-2xl transition-transform duration-300 origin-right ${pendingColor} ${isHigh ? 'scale-125' : 'scale-100'}`}>
                        {lack}
                      </div>
                      
                      {/* Columna 4: Total */}
                      <div className={`text-right font-black text-3xl tracking-tighter tabular-nums leading-none ${totalColor}`}>
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

      {/* Footer Totales Compacto */}
      <div className={`p-6 border-t flex-none ${darkMode ? 'border-white/10 bg-[#080a0f]' : 'border-slate-200 bg-white'}`}>
        <div className="grid grid-cols-[1.5fr_1fr] gap-8">
           <div className="space-y-2">
              <p className={`text-[14px] font-black uppercase tracking-[0.3em] leading-none mb-2 italic ${darkMode ? 'text-white' : 'text-slate-900'}`}>TOTAL ZONA</p>
              <div className="flex items-end gap-3">
                <p className="text-7xl font-black text-red-600 leading-none tracking-tighter tabular-nums">
                  {totalQty.toLocaleString()}
                </p>
                <div className="flex flex-col mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-white/30' : 'text-slate-400'}`}>UDS</span>
                  <div className="w-8 h-1 bg-red-600 mt-1"></div>
                </div>
              </div>
           </div>

           <div className={`grid grid-cols-1 gap-y-3 border-l pl-6 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hash size={14} className="text-red-600 opacity-70" />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                    PEDIDOS
                  </span>
                </div>
                <span className={`text-lg font-black tabular-nums ${darkMode ? 'text-white' : 'text-slate-800'}`}>{group.products.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                  <Boxes size={14} className="text-blue-500 opacity-70" />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                    REALIZADO
                  </span>
                </div>
                <span className="text-lg font-black text-blue-500 tabular-nums">{totalStock.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                  <AlertTriangle size={14} className="text-orange-500 opacity-70" />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                    PENDIENTE
                  </span>
                </div>
                <span className="text-lg font-black text-orange-500 tabular-nums">{totalPending.toLocaleString()}</span>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};
