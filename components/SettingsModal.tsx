
import React, { useState } from 'react';
import { X, Upload, RotateCcw, Save } from 'lucide-react';

interface VisualSettings {
  logoLight: string | null;
  logoDark: string | null;
  displayMode: 'name' | 'code' | 'both';
  maxRowsPerCol: number;
  nameFontSize: number;
  codeFontSize: number;
  clientNameFontSize: number;
  trendFontSize: number;
  clientTrendFontSize: number;
  headerFontSize: number;
  colWidthSingle: number;
  colWidthMulti: number;
  rowVerticalPadding: number;
  footerTotalFontSize: number;
  footerMetricsFontSize: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualSettings: VisualSettings;
  onSaveSettings: (settings: VisualSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, visualSettings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState<VisualSettings>(visualSettings);
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newSettings = { ...localSettings, [mode === 'light' ? 'logoLight' : 'logoDark']: base64 };
        setLocalSettings(newSettings);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateSetting = (key: keyof VisualSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFactoryReset = async () => {
    if (!confirm('⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará TODOS los datos de pedidos e inventario de la base de datos.\n\nEsta acción no se puede deshacer.')) {
      return;
    }

    setIsResetting(true);
    try {
      localStorage.clear();
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Error al resetear el servidor.');
        setIsResetting(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
      setIsResetting(false);
    }
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 flex-none">
          <div>
            <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Configuración del Dashboard</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Control Visual Completo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="text-slate-500" size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scroll flex-1 bg-slate-100 dark:bg-slate-900/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* GRUPO 1: GENERAL */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
              <h3 className="text-xs font-black uppercase text-red-600 tracking-widest border-b pb-2">Visualización General</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Modo de Visualización</label>
                <div className="grid grid-cols-3 gap-2">
                  {['name', 'code', 'both'].map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSetting('displayMode', m)}
                      className={`py-2 px-1 text-[10px] font-black uppercase rounded border ${localSettings.displayMode === m ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      {m === 'name' ? 'Nombre' : m === 'code' ? 'Código' : 'Ambos'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Filas por Columna <span>{localSettings.maxRowsPerCol}</span>
                 </label>
                 <input type="range" min="5" max="50" value={localSettings.maxRowsPerCol} onChange={(e) => updateSetting('maxRowsPerCol', Number(e.target.value))} className="w-full accent-red-600" />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Padding Vertical Filas (px) <span>{localSettings.rowVerticalPadding}</span>
                 </label>
                 <input type="range" min="2" max="20" value={localSettings.rowVerticalPadding || 8} onChange={(e) => updateSetting('rowVerticalPadding', Number(e.target.value))} className="w-full accent-red-600" />
              </div>
            </div>

            {/* GRUPO 2: DIMENSIONES */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
               <h3 className="text-xs font-black uppercase text-red-600 tracking-widest border-b pb-2">Anchos de Columna</h3>
               
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Ancho Columna Simple (px) <span>{localSettings.colWidthSingle}</span>
                 </label>
                 <input type="range" min="250" max="600" step="10" value={localSettings.colWidthSingle || 340} onChange={(e) => updateSetting('colWidthSingle', Number(e.target.value))} className="w-full accent-blue-600" />
                 <p className="text-[10px] text-slate-400">Para clientes con pocos productos (ej. Pingüino)</p>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Ancho Columna Multi (px) <span>{localSettings.colWidthMulti}</span>
                 </label>
                 <input type="range" min="400" max="1000" step="10" value={localSettings.colWidthMulti || 520} onChange={(e) => updateSetting('colWidthMulti', Number(e.target.value))} className="w-full accent-blue-600" />
                 <p className="text-[10px] text-slate-400">Para clientes grandes (ej. Gran Canaria)</p>
               </div>
            </div>

            {/* GRUPO 3: TIPOGRAFÍAS PRODUCTO */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
               <h3 className="text-xs font-black uppercase text-red-600 tracking-widest border-b pb-2">Tipografías Producto</h3>
               
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Nombre Producto (px) <span>{localSettings.nameFontSize}</span>
                 </label>
                 <input type="range" min="8" max="24" value={localSettings.nameFontSize} onChange={(e) => updateSetting('nameFontSize', Number(e.target.value))} className="w-full" />
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Código Producto (px) <span>{localSettings.codeFontSize}</span>
                 </label>
                 <input type="range" min="10" max="40" value={localSettings.codeFontSize} onChange={(e) => updateSetting('codeFontSize', Number(e.target.value))} className="w-full" />
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Badge Tendencia (px) <span>{localSettings.trendFontSize}</span>
                 </label>
                 <input type="range" min="8" max="20" value={localSettings.trendFontSize || 14} onChange={(e) => updateSetting('trendFontSize', Number(e.target.value))} className="w-full" />
               </div>
            </div>

            {/* GRUPO 4: TIPOGRAFÍAS CABECERAS */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
               <h3 className="text-xs font-black uppercase text-red-600 tracking-widest border-b pb-2">Cabeceras Cliente</h3>
               
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Nombre Cliente (px) <span>{localSettings.clientNameFontSize}</span>
                 </label>
                 <input type="range" min="20" max="80" value={localSettings.clientNameFontSize} onChange={(e) => updateSetting('clientNameFontSize', Number(e.target.value))} className="w-full accent-orange-500" />
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Tendencia Cliente (px) <span>{localSettings.clientTrendFontSize}</span>
                 </label>
                 <input type="range" min="12" max="30" value={localSettings.clientTrendFontSize || 18} onChange={(e) => updateSetting('clientTrendFontSize', Number(e.target.value))} className="w-full accent-orange-500" />
               </div>
            </div>

            {/* GRUPO 5: FOOTER (PIE DE PÁGINA) */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
               <h3 className="text-xs font-black uppercase text-red-600 tracking-widest border-b pb-2">Pie de Página (Footer)</h3>
               
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Número Total Rojo (px) <span>{localSettings.footerTotalFontSize}</span>
                 </label>
                 <input type="range" min="30" max="120" value={localSettings.footerTotalFontSize || 60} onChange={(e) => updateSetting('footerTotalFontSize', Number(e.target.value))} className="w-full accent-purple-600" />
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                    Etiquetas Métricas (px) <span>{localSettings.footerMetricsFontSize}</span>
                 </label>
                 <input type="range" min="8" max="20" value={localSettings.footerMetricsFontSize || 11} onChange={(e) => updateSetting('footerMetricsFontSize', Number(e.target.value))} className="w-full accent-purple-600" />
               </div>
            </div>

            {/* GRUPO 6: LOGOS */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
               <h3 className="text-xs font-black uppercase text-red-600 tracking-widest border-b pb-2">Logotipos</h3>
               
               <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Modo Claro</span>
                  <label className="flex items-center gap-3 cursor-pointer bg-slate-100 dark:bg-slate-900 p-3 rounded-lg hover:bg-slate-200 transition-colors">
                     <Upload size={16} className="text-slate-500" />
                     <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Subir Imagen</span>
                     <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'light')} />
                  </label>
               </div>
               
               <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Modo Oscuro</span>
                  <label className="flex items-center gap-3 cursor-pointer bg-slate-100 dark:bg-slate-900 p-3 rounded-lg hover:bg-slate-200 transition-colors">
                     <Upload size={16} className="text-slate-500" />
                     <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Subir Imagen</span>
                     <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'dark')} />
                  </label>
               </div>
            </div>

          </div>

          {/* ZONA DE PELIGRO */}
          <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between">
             <div className="flex items-center gap-4">
               <RotateCcw className="text-red-600" />
               <div>
                 <h4 className="text-sm font-black uppercase text-red-600">Resetear Base de Datos</h4>
                 <p className="text-xs text-red-400">Borra todos los pedidos y stocks. Usar al inicio del día.</p>
               </div>
             </div>
             <button 
               onClick={handleFactoryReset}
               disabled={isResetting}
               className="px-6 py-2 bg-white dark:bg-red-900 border border-red-200 text-red-600 dark:text-red-200 text-xs font-black uppercase rounded hover:bg-red-50 transition-colors disabled:opacity-50"
             >
               {isResetting ? 'Borrando...' : 'Ejecutar Reset'}
             </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 flex-none">
          <button onClick={onClose} className="px-6 py-3 text-xs font-black uppercase text-slate-500 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg flex items-center gap-2">
            <Save size={16} /> Guardar Cambios
          </button>
        </div>

      </div>
    </div>
  );
};
