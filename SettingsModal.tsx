
import React from 'react';
import { X, Server, Key, Globe, Clipboard, ArrowRight } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Estos datos deben coincidir exactamente con server.js
  const railwayBaseUrl = window.location.origin;
  const webhookUrl = `${railwayBaseUrl}/api/webhook`;
  const authToken = 'DASHBOARD_V3_KEY_2025';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-600">
          <div className="flex items-center gap-4 text-white">
            <Server size={32} />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Configuración Make</h2>
              <p className="text-xs font-bold uppercase opacity-80">Conexión Segura V3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
          <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl mb-4">
            <p className="text-sm text-red-700 dark:text-red-400 font-bold">
              Usa estos datos en tu módulo HTTP de Make para enviar el POST correctamente.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-gray-500 flex items-center gap-2">
                <Globe size={14} /> Endpoint URL
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-mono text-xs text-red-600 truncate font-bold border border-gray-200 dark:border-slate-700">
                  {webhookUrl}
                </code>
                <button onClick={() => copyToClipboard(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700">
                  <Clipboard size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-gray-500 flex items-center gap-2">
                <Key size={14} /> Authorization Header
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-mono text-xs text-gray-600 dark:text-gray-400 truncate font-bold border border-gray-200 dark:border-slate-700">
                  Bearer {authToken}
                </code>
                <button onClick={() => copyToClipboard(`Bearer ${authToken}`)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700">
                  <Clipboard size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
             <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
               <ArrowRight size={14} /> Formato esperado
             </h3>
             <pre className="p-4 bg-gray-950 text-green-500 rounded-2xl text-[10px] font-mono overflow-x-auto">
{`{
  "zonas": [
    {
      "nombre": "Producto",
      "codigo_agente": "10",
      "productos": [{ "codigo": "X", "cantidad": 5 }]
    }
  ]
}`}
             </pre>
          </div>
        </div>

        <div className="p-8 bg-gray-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl">
            Cerrar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
