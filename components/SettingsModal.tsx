import React from 'react';
import { X, Server, Key, Globe, Clipboard, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Obtenemos la URL actual del navegador para construir la ruta del webhook
  const currentHostname = window.location.origin;
  const webhookUrl = `${currentHostname}/api/webhook`;
  
  // El token que el usuario ya configuró en Railway
  const authToken = (import.meta as any).env?.VITE_MAKE_API_KEY || 'TOKEN_NO_CONFIGURADO';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Podríamos añadir un toast aquí, pero por simplicidad usamos la interacción del botón
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2.5 rounded-2xl shadow-lg shadow-red-600/30 text-white">
              <Server size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Enlace con Make</h2>
              <p className="text-xs font-bold text-red-600 uppercase tracking-tighter">Configuración del Módulo HTTP</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
          
          <div className="flex items-start gap-4 p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl">
            <Info className="text-blue-600 dark:text-blue-400 shrink-0" size={24} />
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100">¿Cómo conectar Make con este Dashboard?</p>
              <p className="text-xs text-blue-800/70 dark:text-blue-300/70 leading-relaxed">
                Usa el módulo <b>"HTTP > Make a request"</b> en tu escenario de Make. Este dashboard actuará como el receptor de tu JSON.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Paso 1: URL */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={12} /> URL para el Módulo HTTP
                </label>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">PASO 1</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-red-600 break-all">
                  {webhookUrl}
                </div>
                <button 
                  onClick={() => copyToClipboard(webhookUrl)}
                  className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all shadow-sm active:scale-95"
                  title="Copiar URL"
                >
                  <Clipboard size={18} />
                </button>
              </div>
            </div>

            {/* Paso 2: Método y Headers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Método</label>
                <div className="px-4 py-4 bg-gray-100 dark:bg-slate-800/30 rounded-2xl text-xs font-bold text-gray-900 dark:text-white border border-transparent">
                  POST
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Body Type</label>
                <div className="px-4 py-4 bg-gray-100 dark:bg-slate-800/30 rounded-2xl text-xs font-bold text-gray-900 dark:text-white border border-transparent">
                  Raw (JSON)
                </div>
              </div>
            </div>

            {/* Paso 3: Autorización */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Key size={12} /> Header: Authorization
                </label>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">PASO 2</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-gray-600 dark:text-gray-400">
                  <span className="text-red-600 font-bold">Bearer</span> {authToken}
                </div>
                <button 
                  onClick={() => copyToClipboard(`Bearer ${authToken}`)}
                  className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all shadow-sm active:scale-95"
                  title="Copiar Header completo"
                >
                  <Clipboard size={18} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 italic">
                * Este es el código secreto que Railway usa para validar que la petición viene de tu cuenta de Make.
              </p>
            </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" /> Seguridad de Conexión
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              El servidor del dashboard rechazará cualquier petición que no incluya el token correcto. Tu conexión está blindada. Una vez configurado en Make, pulsa "Run Once" en tu escenario para ver los datos aparecer aquí.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
          <button
            onClick={onClose}
            className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-3"
          >
            Cerrar Guía y Volver al Panel
          </button>
        </div>
      </div>
    </div>
  );
};
