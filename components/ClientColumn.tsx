
import React from 'react';
import { Package, CheckCircle } from 'lucide-react';

export const ClientColumn = ({ group, darkMode, settings, highlightedCode }) => {
  const total = group.products.reduce((acc, p) => acc + p.cantidad, 0);
  const done = group.products.filter(p => p.stock >= p.cantidad).length;

  return (
    <div className={`flex-none w-[420px] flex flex-col h-full rounded-3xl border shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-gray-200'}`}>
      <div className="p-6 border-b bg-black/10">
        <div className="flex justify-between items-start">
          <h3 className="text-3xl font-black uppercase tracking-tighter truncate leading-none">{group.name}</h3>
          <span className="text-[10px] font-black bg-red-600 text-white px-2 py-1 rounded-full">{done}/{group.products.length}</span>
        </div>
        <p className="text-[10px] font-bold opacity-30 mt-2 tracking-widest uppercase">ID AGENTE: {group.code}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scroll">
        {group.products.map(p => {
          const lack = Math.max(0, p.cantidad - p.stock);
          const isFinished = lack <= 0;
          const isHigh = highlightedCode === p.codigo;

          return (
            <div key={p.codigo} className={`p-4 rounded-2xl border transition-all duration-500 ${isHigh ? 'bg-green-500/20 scale-[1.02]' : (isFinished ? 'opacity-30' : (darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'))}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-black text-lg">#{p.codigo}</span>
                {isFinished && <CheckCircle size={14} className="text-green-500" />}
              </div>
              <div className="text-[10px] font-bold opacity-50 uppercase truncate mb-3">{p.nombre}</div>
              
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black opacity-40 uppercase">Stock</span>
                  <span className="font-bold text-blue-500">{p.stock}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black opacity-40 uppercase">Falta</span>
                  <span className={`font-black ${isFinished ? 'text-green-500' : 'text-orange-500'}`}>{isFinished ? 'OK' : lack}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black opacity-40 uppercase">Total</span>
                  <span className="text-2xl font-black leading-none">{p.cantidad}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 border-t bg-red-600/5">
        <span className="text-[10px] font-black opacity-40 block mb-1">UNIDADES TOTALES</span>
        <span className="text-7xl font-black text-red-600 tracking-tighter tabular-nums leading-none">{total}</span>
      </div>
    </div>
  );
};
