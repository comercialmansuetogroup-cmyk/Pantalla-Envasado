
import React from 'react';
import { X, Server, Key, Globe, Clipboard, Info, ArrowRight } from 'lucide-react';
import { AppSettings } from '../types.ts';

// Fix: Removed currentSettings and onSave from the interface as they are not used within the component
// but were incorrectly marked as mandatory, causing a type error during instantiation.
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const railwayBaseUrl = 'https://pantalla-envasado-production.up.railway.app';
  const webhookUrl = `${railwayBaseUrl}/api/webhook`;
  const authToken = '563027d1-1af0-4c0e-a385-74cc322f2f66';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col transition-all">
        <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-600">
          <div className="flex items-center gap-4 text-white">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Server size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Integración Make</h2>
              <p className="text-xs font-bold uppercase opacity-80 tracking-widest">Configuración HTTP Request</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-[2rem] border border-gray-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-500 font-black text-xs uppercase tracking-widest">
                <Globe size={14} /> URL
              </div>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-mono text-[10px] text-red-600 truncate font-bold">
                  {webhookUrl}
                </code>
                <button onClick={() => copyToClipboard(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-90 transition-all">
                  <Clipboard size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-[2rem] border border-gray-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-500 font-black text-xs uppercase tracking-widest">
                <Key size={14} /> Authorization Header
              </div>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-mono text-[10px] text-gray-600 dark:text-gray-400 truncate font-bold">
                  Bearer {authToken}
                </code>
                <button onClick={() => copyToClipboard(`Bearer ${authToken}`)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-90 transition-all">
                  <Clipboard size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
               <ArrowRight size={14} className="text-red-600" /> Parámetros en Make
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Method</p>
                  <p className="text-sm font-bold">POST</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Body type</p>
                  <p className="text-sm font-bold">Raw</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Content type</p>
                  <p className="text-sm font-bold">JSON</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status</p>
                  <p className="text-sm font-bold text-green-500 font-black">ACTIVO</p>
                </div>
             </div>
          </div>
        </div>

        <div className="p-10 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
          <button
            onClick={onClose}
            className="w-full py-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.01]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
