
import React, { useState, useEffect } from 'react';
import { X, Upload, Settings as SettingsIcon, Type, Layout } from 'lucide-react';
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
        const newSettings = { ...localSettings, [mode === 'light' ? 'logoLight' : 'logoDark']: reader.result as string };
        setLocalSettings(newSettings);
        onSaveSettings(newSettings);
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
    <div className="fixed inset-0 z-[200] flex items-center justify-end bg-black/90 backdrop-blur-sm">
      <div className="bg-[#1a1d26] w-[550px] h-full shadow-2xl border-l border-white/10 flex flex-col p-12 animate-slide-in">
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <SettingsIcon size={28} className="text-red-600" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Configuración Industrial</h2>
          </div>
          <button onClick={onClose} className="text-5xl font-bold opacity-20 hover:opacity-100 transition-all text-white">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-12 pr-6 custom-scroll">
          <section className="space-y-6">
            <label className="text-[11px] font-black opacity-40 uppercase tracking-[0.3em] flex items-center gap-2">
              <Upload size={14} /> IDENTIDAD VISUAL (LOGOS)
            </label>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">VERSIÓN CLARA</p>
                <div className="relative group h-28 bg-white/5 border border-white/10 flex items-center justify-center p-6">
                  {localSettings.logoLight ? <img src={localSettings.logoLight} className="max-h-full" /> : <Upload size={24} className="opacity-10" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleLogoUpload(e, 'light')} />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">VERSIÓN OSCURA</p>
                <div className="relative group h-28 bg-white/5 border border-white/10 flex items-center justify-center p-6">
                  {localSettings.logoDark ? <img src={localSettings.logoDark} className="max-h-full" /> : <Upload size={24} className="opacity-10" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleLogoUpload(e, 'dark')} />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <label className="text-[11px] font-black opacity-40 uppercase tracking-[0.3em] flex items-center gap-2">
              <Layout size={14} /> ESTRUCTURA DE PANTALLA
            </label>
            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-black"><span>PRODUCTOS POR COLUMNA</span> <span className="text-red-600">{localSettings.maxRowsPerCol}</span></div>
              <input type="range" min="5" max="50" value={localSettings.maxRowsPerCol} onChange={(e) => updateSetting('maxRowsPerCol', parseInt(e.target.value))} className="w-full accent-red-600" />
            </div>
          </section>

          <section className="space-y-10 pt-10 border-t border-white/5">
            <label className="text-[11px] font-black opacity-40 uppercase tracking-[0.3em] flex items-center gap-2">
              <Type size={14} /> TIPOGRAFÍAS Y DIMENSIONES (PX)
            </label>
            <div className="grid grid-cols-2 gap-x-10 gap-y-8">
              {[
                { label: 'Nombre Cliente', key: 'clientNameFontSize' },
                { label: 'Referencia/Código', key: 'codeFontSize' },
                { label: 'Nombre Producto', key: 'nameFontSize' },
                { label: 'Tendencias (%)', key: 'trendFontSize' }
              ].map(f => (
                <div key={f.key} className="space-y-3">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{f.label}</p>
                  <input 
                    type="number" 
                    value={localSettings[f.key as keyof VisualSettings] as number} 
                    onChange={(e) => updateSetting(f.key as keyof VisualSettings, parseInt(e.target.value))} 
                    className="w-full bg-black/40 p-4 text-xl font-black text-center border border-white/5 text-white focus:border-red-600 transition-colors" 
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="pt-12 border-t border-white/5">
             <button onClick={() => { if(confirm('¿Reiniciar todo el sistema?')) fetch('/api/reset', {method:'POST'}) }} className="w-full py-5 bg-red-600/10 text-red-500 border border-red-500/20 text-[11px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Limpiar Histórico del Día</button>
          </section>
        </div>

        <button onClick={onClose} className="mt-12 w-full py-6 bg-white text-black text-sm font-black uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all shadow-2xl">Aplicar y Guardar</button>
      </div>
    </div>
  );
};
