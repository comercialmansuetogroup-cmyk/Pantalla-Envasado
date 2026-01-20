
import React, { useState, useEffect } from 'react';
import { X, Settings, Upload, LayoutGrid, Type, CreditCard, Layers } from 'lucide-react';
import { VisualSettings } from './types';

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

  const updateSetting = (key: keyof VisualSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
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

  const SliderRow = ({ label, value, min, max, unit = 'px', onChange }: any) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-black text-white">{value}{unit}</span>
      </div>
      <input 
        type="range" min={min} max={max} value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600 slider-thumb-red"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] flex justify-end">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#1a1c23] h-full flex flex-col shadow-2xl border-l border-white/5 overflow-hidden">
        
        {/* HEADER V4 */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#1f222a]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/20">
              <Settings size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white leading-tight">Configuración</h2>
              <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest">Panel de Control V4</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scroll pb-32">
          
          {/* LOGOTIPOS */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
              <Upload size={14} /> LOGOTIPOS
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-video bg-[#282c35] rounded-xl border border-white/5 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                  {localSettings.logoLight ? (
                    <img src={localSettings.logoLight} className="max-h-full object-contain" />
                  ) : (
                    <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">Vacío</span>
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleLogoUpload(e, 'light')} />
                </div>
                <button className="w-full py-2.5 bg-[#282c35] hover:bg-slate-700 text-[10px] font-black uppercase text-white/60 tracking-widest rounded-lg border border-white/5 transition-colors">
                  Modo Claro
                </button>
              </div>
              <div className="space-y-4">
                <div className="aspect-video bg-[#12141a] rounded-xl border border-white/5 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                  {localSettings.logoDark ? (
                    <img src={localSettings.logoDark} className="max-h-full object-contain" />
                  ) : (
                    <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">Vacío</span>
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleLogoUpload(e, 'dark')} />
                </div>
                <button className="w-full py-2.5 bg-[#282c35] hover:bg-slate-700 text-[10px] font-black uppercase text-white/60 tracking-widest rounded-lg border border-white/5 transition-colors">
                  Modo Oscuro
                </button>
              </div>
            </div>
          </section>

          {/* GRID & ESTRUCTURA */}
          <section className="space-y-8">
            <h3 className="text-[11px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
              <LayoutGrid size={14} /> GRID & ESTRUCTURA
            </h3>
            
            <div className="bg-[#1f222a] p-6 rounded-2xl border border-white/5 space-y-8">
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Modo Visualización</span>
                <div className="flex bg-[#12141a] p-1 rounded-xl">
                  {['name', 'code', 'both'].map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSetting('displayMode', m)}
                      className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${localSettings.displayMode === m ? 'bg-[#282c35] text-white shadow-xl' : 'text-white/20 hover:text-white/40'}`}
                    >
                      {m === 'name' ? 'Nombre' : m === 'code' ? 'Código' : 'Ambos'}
                    </button>
                  ))}
                </div>
              </div>

              <SliderRow 
                label="Filas Máximas por Columna" 
                value={localSettings.maxRowsPerCol} 
                min={5} max={40} unit=""
                onChange={(v: any) => updateSetting('maxRowsPerCol', v)} 
              />

              <SliderRow 
                label="Padding Vertical (Filas)" 
                value={localSettings.rowVerticalPadding} 
                min={0} max={40}
                onChange={(v: any) => updateSetting('rowVerticalPadding', v)} 
              />

              <div className="pt-4 border-t border-white/5 space-y-6">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dimensiones de Tarjeta</p>
                <SliderRow 
                  label="Ancho Columna Simple" 
                  value={localSettings.colWidthSingle} 
                  min={200} max={600}
                  onChange={(v: any) => updateSetting('colWidthSingle', v)} 
                />
                <SliderRow 
                  label="Ancho Columna Múltiple" 
                  value={localSettings.colWidthMulti} 
                  min={300} max={1000}
                  onChange={(v: any) => updateSetting('colWidthMulti', v)} 
                />
              </div>
            </div>
          </section>

          {/* TIPOGRAFÍAS */}
          <section className="space-y-8">
            <h3 className="text-[11px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
              <Type size={14} /> TIPOGRAFÍAS
            </h3>
            <div className="bg-[#1f222a] p-6 rounded-2xl border border-white/5 space-y-6">
              <SliderRow 
                label="Nombre Cliente (Cabecera)" 
                value={localSettings.clientNameFontSize} 
                min={12} max={120}
                onChange={(v: any) => updateSetting('clientNameFontSize', v)} 
              />
              <SliderRow 
                label="Tendencia Cliente (%)" 
                value={localSettings.clientTrendFontSize} 
                min={8} max={40}
                onChange={(v: any) => updateSetting('clientTrendFontSize', v)} 
              />
              <SliderRow 
                label="Código Producto" 
                value={localSettings.codeFontSize} 
                min={8} max={60}
                onChange={(v: any) => updateSetting('codeFontSize', v)} 
              />
              <SliderRow 
                label="Nombre Producto" 
                value={localSettings.nameFontSize} 
                min={8} max={40}
                onChange={(v: any) => updateSetting('nameFontSize', v)} 
              />
              <SliderRow 
                label="Tendencia Producto (%)" 
                value={localSettings.trendFontSize} 
                min={8} max={40}
                onChange={(v: any) => updateSetting('trendFontSize', v)} 
              />
            </div>
          </section>

          {/* PIE DE PÁGINA */}
          <section className="space-y-8">
            <h3 className="text-[11px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
              <Layers size={14} /> PIE DE PÁGINA
            </h3>
            <div className="bg-[#1f222a] p-6 rounded-2xl border border-white/5 space-y-6">
              <SliderRow 
                label="Tamaño Total (Rojo)" 
                value={localSettings.footerTotalFontSize} 
                min={20} max={120}
                onChange={(v: any) => updateSetting('footerTotalFontSize', v)} 
              />
            </div>
          </section>

        </div>

        {/* FOOTER ACTION */}
        <div className="absolute bottom-0 left-0 w-full p-8 bg-[#1a1c23] border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <button 
            onClick={handleSave}
            className="w-full py-5 bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] text-sm hover:bg-red-600 hover:text-white transition-all transform active:scale-[0.98]"
          >
            Guardar Cambios
          </button>
        </div>
      </div>

      <style>{`
        .slider-thumb-red::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #dc2626;
          cursor: pointer;
          border-radius: 50%;
          border: 3px solid #1a1c23;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.4);
        }
        .slider-thumb-red::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #dc2626;
          cursor: pointer;
          border-radius: 50%;
          border: 3px solid #1a1c23;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.4);
        }
      `}</style>
    </div>
  );
};
