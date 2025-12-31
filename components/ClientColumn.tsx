
import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export const ClientColumn = ({ group, darkMode, settings, highlightedCode }) => {
  const totalQty = group.products.reduce((acc, p) => acc + Number(p.cantidad), 0);
  const totalStock = group.products.reduce((acc, p) => acc + Number(p.stock), 0);
  const progress = totalQty > 0 ? (totalStock / totalQty) * 100 : 0;

  return (
    <div className={`flex-none w-[450px] flex flex-col h-full rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all duration-300 ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200'}`}>
      {/* Header Cliente */}
      <div className="p-8 border-b bg-black/10">
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-black leading-none uppercase tracking-tighter truncate" style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
            ID: {group.code}
          </span>
        </div>
        
        {/* Barra de Progreso del Cliente */}
        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-red-600 transition-all duration-1000" 
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Lista de Productos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
        {group.products.map((p, idx) => {
          const lack = Math.max(0, p.cantidad - p.stock);
          const isDone = lack <= 0;
          const isHigh = highlightedCode === p.codigo;

          return (
            <div 
              key={idx} 
              className={`p-5 rounded-3xl border transition-all duration-500 ${
                isHigh ? 'bg-green-500/20 scale-[1.02] border-green-500' : 
                isDone ? 'opacity-30 grayscale border-transparent' : 
                darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-black text-xl tracking-tight" style={{ fontSize: `${settings.codeFontSize}px` }}>
                  #{p.codigo}
                </span>
                {isDone ? <CheckCircle className="text-green-500" size={20} /> : <AlertCircle className="text-orange-500" size={20} />}
              </div>
              
              <div className="text-xs font-bold uppercase opacity-50 truncate mb-4" style={{ fontSize: `${settings.nameFontSize}px` }}>
                {p.nombre}
              </div>

              <div className="flex justify-between items-end border-t border-black/5 pt-4">
                <div className="space-y-1 text-center">
                  <p className="text-[8px] font-black opacity-40 uppercase">Stock</p>
                  <p className="text-xl font-bold text-blue-500">{p.stock}</p>
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-[8px] font-black opacity-40 uppercase">Falta</p>
                  <p className={`text-xl font-black ${isDone ? 'text-green-500' : 'text-red-500'}`}>{isDone ? 'OK' : lack}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] font-black opacity-40 uppercase">Total Pedido</p>
                  <p className="text-4xl font-black leading-none tracking-tighter">{p.cantidad}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Columna */}
      <div className="p-8 border-t bg-red-600/5 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black opacity-40 uppercase">Total Unidades</p>
          <p className="text-6xl font-black text-red-600 tracking-tighter tabular-nums leading-none">
            {totalQty}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black opacity-40 uppercase">Items</p>
          <p className="text-2xl font-black">{group.products.length}</p>
        </div>
      </div>
    </div>
  );
};
