
import React, { useState, useEffect } from 'react';
import { X, Upload, Settings as SettingsIcon, Type, Layout, TrendingUp } from 'lucide-react';
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
    <div className="fixed inset-0 z-[200] flex items-center justify-end bg-black/95 backdrop-blur-xl animate-fade-in">
      <div className="bg-[#12151c] w-[600px] h-full shadow-2xl border-l border-white/10 flex flex-col p-16 animate-slide-in">
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-6">
            <SettingsIcon size={40} className="text-red-600" />
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Configuración Industrial</h2>
          </div>
          <button onClick={onClose} className="text-6xl font-bold opacity-20 hover:opacity-100 transition-all text-white">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-16 pr-8 custom-scroll">
          {/* SECCIÓN LOGOS DUALES */}
          <section className="space-y-8">
            <label className="text-[12px] font-black opacity-40 uppercase tracking-[0.4em] flex items-center gap-3">
              <Upload size={18} /> IDENTIDAD CORPORATIVA (LOGO ANCHO)
            </label>
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">VERSIÓN MODO CLARO (FONDO OSCURO)</p>
                <div className="relative group h-40 bg-white/5 border border-white/10 flex items-center justify-center p-8 hover:border-red-600 transition-colors">
                  {localSettings.logoLight ? <img src={localSettings.logoLight} className="max-h-full max-w-full object-contain" /> : <Upload size={32} className="opacity-10" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleLogoUpload(e, 'light')} />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">VERSIÓN MODO OSCURO (FONDO CLARO)</p>
                <div className="relative group h-40 bg-white/5 border border-white/10 flex items-center justify-center p-8 hover:border-red-600 transition-colors">
                  {localSettings.logoDark ? <img src={localSettings.logoDark} className="max-h-full max-w-full object-contain" /> : <Upload size={32} className="opacity-10" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleLogoUpload(e, 'dark')} />
                </div>
              </div>
            </div>
          </section>

          {/* FUENTES Y TENDENCIAS */}
          <section className="space-y-12 pt-12 border-t border-white/5">
            <label className="text-[12px] font-black opacity-40 uppercase tracking-[0.4em] flex items-center gap-3">
              <Type size={18} /> CONTROL DE TIPOGRAFÍA (PX)
            </label>
            <div className="grid grid-cols-2 gap-12">
              {[
                { label: 'Título Cliente', key: 'clientNameFontSize' },
                { label: 'Código Ref.', key: 'codeFontSize' },
                { label: 'Nombre Producto', key: 'nameFontSize' },
                { label: 'Tendencias (%)', key: 'trendFontSize' }
              ].map(f => (
                <div key={f.key} className="space-y-4">
                  <p className="text-[11px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2">
                    {f.key === 'trendFontSize' && <TrendingUp size={14} className="text-green-500" />} {f.label}
                  </p>
                  <input 
                    type="number" 
                    value={localSettings[f.key as keyof VisualSettings] as number} 
                    onChange={(e) => updateSetting(f.key as keyof VisualSettings, parseInt(e.target.value))} 
                    className="w-full bg-black/50 p-6 text-3xl font-black text-center border border-white/10 text-white focus:border-red-600 focus:bg-red-600/5 transition-all outline-none" 
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-8 pt-8 border-t border-white/5">
            <label className="text-[12px] font-black opacity-40 uppercase tracking-[0.4em] flex items-center gap-3">
              <Layout size={18} /> ESTRUCTURA DE PANTALLA
            </label>
            <div className="space-y-6">
              <div className="flex justify-between text-[12px] font-black"><span>MÁX. FILAS POR COLUMNA</span> <span className="text-red-600 text-xl">{localSettings.maxRowsPerCol}</span></div>
              <input type="range" min="5" max="50" value={localSettings.maxRowsPerCol} onChange={(e) => updateSetting('maxRowsPerCol', parseInt(e.target.value))} className="w-full accent-red-600 h-2 bg-white/10" />
            </div>
          </section>

          <div className="pt-12">
             <button onClick={() => { if(confirm('¿Reiniciar base de datos temporal?')) fetch('/api/reset', {method:'POST'}) }} className="w-full py-6 bg-red-600/10 text-red-500 border border-red-500/20 text-[12px] font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-xl">Limpiar Datos del Día</button>
          </div>
        </div>

        <button onClick={onClose} className="mt-16 w-full py-8 bg-red-600 text-white text-md font-black uppercase tracking-[0.5em] hover:bg-white hover:text-red-600 transition-all shadow-[0_0_50px_rgba(220,38,38,0.3)]">Guardar Configuración</button>
      </div>
    </div>
  );
};
