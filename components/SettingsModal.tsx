
import React, { useState, useEffect } from 'react';
import { X, Upload, Layout, Type, Trash2, Clipboard, Globe, Settings as SettingsIcon } from 'lucide-react';
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

  const updateSetting = (key: keyof VisualSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-end bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1d26] w-[500px] h-full shadow-2xl border-l border-white/10 flex flex-col p-10 animate-slide-in">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <SettingsIcon size={24} className="text-red-600" />
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">System Configuration</h2>
          </div>
          <button onClick={onClose} className="text-4xl font-bold opacity-30 hover:opacity-100 transition-all">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-10 pr-4 custom-scroll">
          {/* LOGOS */}
          <section className="space-y-4">
            <label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Identidad Visual (Logos)</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[8px] font-bold opacity-50 uppercase">Logo Claro (Light)</p>
                <div className="relative group h-24 bg-white/5 border border-white/10 flex items-center justify-center p-4">
                  {localSettings.logoLight ? <img src={localSettings.logoLight} className="max-h-full" /> : <Upload size={20} className="opacity-20" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleLogoUpload(e, 'light')} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[8px] font-bold opacity-50 uppercase">Logo Oscuro (Dark)</p>
                <div className="relative group h-24 bg-white/5 border border-white/10 flex items-center justify-center p-4">
                  {localSettings.logoDark ? <img src={localSettings.logoDark} className="max-h-full" /> : <Upload size={20} className="opacity-20" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleLogoUpload(e, 'dark')} />
                </div>
              </div>
            </div>
            <button onClick={() => {updateSetting('logoLight', null); updateSetting('logoDark', null)}} className="w-full py-2 bg-red-600/10 text-red-500 text-[10px] font-black uppercase border border-red-600/20">Reiniciar Logos</button>
          </section>

          {/* DENSIDAD */}
          <section className="space-y-4">
            <label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Estructura y Columnas</label>
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold"><span>FILAS POR COLUMNA</span> <span className="text-red-500">{localSettings.maxRowsPerCol}</span></div>
              <input type="range" min="5" max="50" value={localSettings.maxRowsPerCol} onChange={(e) => updateSetting('maxRowsPerCol', parseInt(e.target.value))} className="w-full accent-red-600" />
            </div>
          </section>

          {/* FUENTES */}
          <section className="space-y-6 pt-6 border-t border-white/5">
            <label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Tipografías y Tamaños (PX)</label>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <p className="text-[9px] font-bold opacity-50 uppercase">Nombre Cliente</p>
                <input type="number" value={localSettings.clientNameFontSize} onChange={(e) => updateSetting('clientNameFontSize', parseInt(e.target.value))} className="w-full bg-black/40 p-3 text-sm font-black text-center border border-white/5" />
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-bold opacity-50 uppercase">Referencia</p>
                <input type="number" value={localSettings.codeFontSize} onChange={(e) => updateSetting('codeFontSize', parseInt(e.target.value))} className="w-full bg-black/40 p-3 text-sm font-black text-center border border-white/5" />
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-bold opacity-50 uppercase">Nombre Producto</p>
                <input type="number" value={localSettings.nameFontSize} onChange={(e) => updateSetting('nameFontSize', parseInt(e.target.value))} className="w-full bg-black/40 p-3 text-sm font-black text-center border border-white/5" />
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-bold opacity-50 uppercase">Tendencia (%)</p>
                <input type="number" value={localSettings.trendFontSize} onChange={(e) => updateSetting('trendFontSize', parseInt(e.target.value))} className="w-full bg-black/40 p-3 text-sm font-black text-center border border-white/5" />
              </div>
            </div>
          </section>

          {/* RESET DATA */}
          <section className="pt-10 border-t border-white/5">
             <button onClick={() => { if(confirm('¿Reiniciar producción de hoy?')) fetch('/api/reset', {method:'POST'}) }} className="w-full py-4 bg-red-600/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Limpiar Base de Datos (Hoy)</button>
          </section>
        </div>

        <button onClick={onClose} className="mt-10 w-full py-5 bg-white text-black text-xs font-black uppercase tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all">Aplicar Cambios</button>
      </div>
    </div>
  );
};
