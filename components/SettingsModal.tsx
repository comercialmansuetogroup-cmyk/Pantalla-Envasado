
import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Upload, Monitor, Type, Layout, Database } from 'lucide-react';
import { VisualSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualSettings: VisualSettings;
  onSaveSettings: (settings: VisualSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, visualSettings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState<VisualSettings>(visualSettings);

  useEffect(() => {
    setLocalSettings(visualSettings);
  }, [visualSettings, isOpen]);

  if (!isOpen) return null;

  // Variables de entorno para mostrar en la UI
  const railwayBaseUrl = window.location.origin;
  const webhookUrl = `${railwayBaseUrl}/api/webhook`;
  const authToken = 'DASHBOARD_V3_KEY_2025';

  const updateSetting = (key: keyof VisualSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSetting(mode === 'light' ? 'logoLight' : 'logoDark', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFactoryReset = async () => {
    if (confirm('⚠️ ¿BORRAR TODA LA BASE DE DATOS?\nEsta acción es irreversible.')) {
        try {
            await fetch('/api/reset', { method: 'POST' });
            localStorage.clear();
            window.location.reload();
        } catch(e) { alert('Error de conexión'); }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Side Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1a1d24] h-full shadow-2xl flex flex-col border-l dark:border-white/10 animate-slide-in-right">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#1a1d24] z-10">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter dark:text-white text-slate-900">Configuración</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sistema V3.5</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors dark:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scroll">
          
          {/* SECCIÓN 1: MODO DE VISUALIZACIÓN (LO QUE PEDISTE) */}
          <section>
            <h3 className="text-xs font-black uppercase text-red-600 tracking-widest mb-4 flex items-center gap-2">
              <Monitor size={14} /> Visualización de Producto
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'both', label: 'AMBOS', sub: 'Código + Nombre' },
                  { id: 'code', label: 'CÓDIGO', sub: 'Solo Referencia' },
                  { id: 'name', label: 'NOMBRE', sub: 'Solo Descripción' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => updateSetting('displayMode', mode.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      localSettings.displayMode === mode.id 
                        ? 'bg-red-600 border-red-600 text-white shadow-md' 
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-red-400 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-xs font-black">{mode.label}</div>
                    <div className="text-[9px] opacity-70 mt-1 leading-tight">{mode.sub}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 italic mt-2">
                * "Ambos" es la vista recomendada: Muestra el código en negrita arriba y el nombre debajo.
              </p>
            </div>
          </section>

          <hr className="border-gray-100 dark:border-white/5" />

          {/* SECCIÓN 2: IDENTIDAD VISUAL */}
          <section>
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
              <Upload size={14} /> Logotipos
            </h3>
            <div className="grid grid-cols-2 gap-4">
               {/* Logo Light */}
               <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase dark:text-gray-500">Modo Claro</label>
                  <label className="block h-20 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:border-red-400 transition-colors relative flex items-center justify-center bg-gray-50 dark:bg-black/20">
                     {localSettings.logoLight ? (
                        <img src={localSettings.logoLight} className="h-16 w-auto object-contain" />
                     ) : <span className="text-[9px] text-gray-400">SUBIR PNG</span>}
                     <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'light')} />
                  </label>
               </div>
               {/* Logo Dark */}
               <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase dark:text-gray-500">Modo Oscuro</label>
                  <label className="block h-20 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:border-red-400 transition-colors relative flex items-center justify-center bg-gray-900">
                     {localSettings.logoDark ? (
                        <img src={localSettings.logoDark} className="h-16 w-auto object-contain" />
                     ) : <span className="text-[9px] text-gray-500">SUBIR PNG</span>}
                     <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'dark')} />
                  </label>
               </div>
            </div>
          </section>

          <hr className="border-gray-100 dark:border-white/5" />

          {/* SECCIÓN 3: TIPOGRAFÍA */}
          <section>
             <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
              <Type size={14} /> Tamaños de Fuente
            </h3>
            <div className="space-y-4 bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
               <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1 dark:text-gray-300">
                     <span>Tamaño Código</span>
                     <span>{localSettings.codeFontSize}px</span>
                  </div>
                  <input type="range" min="10" max="32" value={localSettings.codeFontSize} onChange={(e) => updateSetting('codeFontSize', Number(e.target.value))} className="w-full accent-red-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
               </div>
               <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1 dark:text-gray-300">
                     <span>Tamaño Nombre</span>
                     <span>{localSettings.nameFontSize}px</span>
                  </div>
                  <input type="range" min="8" max="24" value={localSettings.nameFontSize} onChange={(e) => updateSetting('nameFontSize', Number(e.target.value))} className="w-full accent-red-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
               </div>
               <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1 dark:text-gray-300">
                     <span>Cabecera Clientes</span>
                     <span>{localSettings.clientNameFontSize}px</span>
                  </div>
                  <input type="range" min="20" max="80" value={localSettings.clientNameFontSize} onChange={(e) => updateSetting('clientNameFontSize', Number(e.target.value))} className="w-full accent-red-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
               </div>
            </div>
          </section>

          <hr className="border-gray-100 dark:border-white/5" />

          {/* SECCIÓN 4: ESTRUCTURA */}
          <section>
             <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
              <Layout size={14} /> Estructura Grid
            </h3>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1 dark:text-gray-300">
                     <span>Filas por Columna</span>
                     <span>{localSettings.maxRowsPerCol}</span>
                  </div>
                  <input type="range" min="5" max="50" value={localSettings.maxRowsPerCol} onChange={(e) => updateSetting('maxRowsPerCol', Number(e.target.value))} className="w-full accent-red-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
               </div>
            </div>
          </section>

           <hr className="border-gray-100 dark:border-white/5" />

           {/* SECCIÓN 5: INTEGRACIÓN */}
           <section>
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
               <Database size={14} /> Integración Make
              </h3>
              <div className="space-y-2">
                 <div className="bg-gray-100 dark:bg-black/30 p-3 rounded text-[9px] font-mono break-all dark:text-gray-400 border dark:border-white/5">
                    {webhookUrl}
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded">ONLINE</span>
                    <span className="text-[9px] text-gray-400">Token: ...KEY_2025</span>
                 </div>
              </div>
           </section>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#15171c]">
           <button 
             onClick={handleFactoryReset}
             className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-500 rounded-lg text-xs font-black uppercase hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
           >
              <RotateCcw size={14} /> Resetear Fábrica
           </button>
        </div>

      </div>
    </div>
  );
};
