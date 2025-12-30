import React from 'react';
import { X, Server, Key, Globe, Clipboard, CheckCircle, Info, ArrowRight } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // URL de Railway proporcionada por el usuario
  const railwayBaseUrl = 'https://pantalla-envasado-production.up.railway.app';
  const webhookUrl = `${railwayBaseUrl}/api/webhook`;
  
  // El token que el usuario ya tiene en las variables de Railway
  const authToken = (import.meta as any).env?.VITE_MAKE_API_KEY || '563027d1-1af0-4c0e-a385-74cc322f2f66';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col transition-all">
        
        {/* Header con estilo corporativo Rojo/Blanco */}
        <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-600">
          <div className="flex items-center gap-4 text-white">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Server size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Configuración de Enlace</h2>
              <p className="text-xs font-bold uppercase opacity-80 tracking-widest">Integración Make → Railway</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
            <X size={24} />
          </button>
        </div>

        {/* Cuerpo de la Guía */}
        <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-[2rem] border border-gray-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-500 font-black text-xs uppercase tracking-widest">
                <Globe size={14} /> 1. URL de Conexión
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                Esta es la dirección pública de tu dashboard en Railway. Pégala en el campo <b>URL</b> de Make.
              </p>
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
                <Key size={14} /> 2. Autorización (Bearer)
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                Esta es tu "llave" secreta. En Make, añade un Header llamado <b>Authorization</b> con este valor.
              </p>
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
               <ArrowRight size={14} className="text-red-600" /> Configuración en el módulo HTTP de Make
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Method</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">POST</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Body type</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Raw</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Content type</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">JSON</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">API Key</p>
                  <p className="text-sm font-bold text-red-600">Activa</p>
                </div>
             </div>
          </div>

          <div className="flex items-start gap-4 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-3xl">
            <Info className="text-red-600 shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-900 dark:text-red-100 uppercase tracking-tight">Nota de Seguridad</p>
              <p className="text-[11px] text-red-800/70 dark:text-red-300/70 leading-relaxed font-medium">
                No necesitas crear nada nuevo. Al configurar estos datos en Make, tu escenario podrá enviar el JSON directamente a este panel de control de forma segura.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
          <button
            onClick={onClose}
            className="w-full py-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95"
          >
            He terminado la configuración
          </button>
        </div>
      </div>
    </div>
  );
};
