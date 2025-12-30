import React from 'react';
import { ClientGroup } from '../types';
import { Package } from 'lucide-react';

interface ClientColumnProps {
  data: ClientGroup;
  darkMode: boolean;
}

export const ClientColumn: React.FC<ClientColumnProps> = ({ data, darkMode }) => {
  return (
    <div className={`
      flex flex-col h-full rounded-xl overflow-hidden shadow-lg border transition-all duration-300
      ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}
    `}>
      {/* Header */}
      <div className={`
        px-6 py-4 border-b flex justify-between items-center
        ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'}
      `}>
        <h3 className={`text-xl font-bold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {data.clientName}
        </h3>
        <span className={`px-2 py-1 text-xs rounded font-mono ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
          ID: {data.clientId.substring(0, 3).toUpperCase()}
        </span>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {data.products.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
            <Package size={48} strokeWidth={1} />
            <span className="mt-2 text-sm">Sin productos</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-xs uppercase tracking-wider border-b ${darkMode ? 'text-gray-500 border-slate-700' : 'text-gray-400 border-gray-100'}`}>
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 text-right font-medium">Cant.</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-700/50' : 'divide-gray-100'}`}>
              {data.products.map((product, idx) => (
                <tr key={`${data.clientId}-${product.name}-${idx}`} className="group">
                  <td className={`py-3 pr-4 font-medium transition-colors ${darkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-black'}`}>
                    {product.name}
                  </td>
                  <td className={`py-3 text-right font-bold text-lg tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {product.totalQuantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Grand Total */}
      <div className={`
        px-6 py-5 mt-auto border-t
        ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-red-50 border-red-100'}
      `}>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-red-800/70'}`}>
            Gran Total
          </span>
          <span className={`text-3xl font-black ${darkMode ? 'text-red-500' : 'text-red-600'}`}>
            {data.grandTotal}
          </span>
        </div>
      </div>
    </div>
  );
};
