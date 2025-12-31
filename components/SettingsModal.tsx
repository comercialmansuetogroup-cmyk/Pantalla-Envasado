
import React, { useState, useEffect } from 'react';
import { X, Server, Key, Globe, Clipboard, ArrowRight, Upload, Layout, Settings, Factory } from 'lucide-react';
import { VisualSettings } from '../types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualSettings: VisualSettings;
  onSaveSettings: (settings: VisualSettings) => void;
  systemLogs?: string[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, visualSettings, onSaveSettings, systemLogs }) => {
  const [localSettings, setLocalSettings] = useState<VisualSettings>(visualSettings);

  useEffect(() => {
    if (isOpen) setLocalSettings(visualSettings);
  }, [isOpen, visualSettings]);

  if (!isOpen) return null;

  const webhookUrl = `${window.location.origin}/api/webhook`;
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-fade-in">
      <div className="bg-slate-900 rounded-[3rem] border border-white/10 w-full max-w-4xl overflow-hidden flex flex-col h-[85vh] shadow-2xl">
        <div className="px-10 py-8 bg-red-600 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-4">
            <Settings size={32} />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Panel de Control</h2>
              <p className="text-[10px] font-bold uppercase opacity-70">Ajustes Visuales Engine V6</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"><X /></button>
        </div>

        <div className="p-10 space-y-12 overflow-y-auto grow custom-scroll">
          <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em] flex items-center gap-2">
              <Layout size={14} /> Tipografía y Visualización
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {['clientNameFontSize', 'codeFontSize', 'nameFontSize'].map(key => (
                <div key={key} className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase opacity-50">
                    <span>{key.replace('FontSize', '')}</span>
                    <span className="text-red-500 font-black">{localSettings[key as keyof VisualSettings]}px</span>
                  </div>
                  <input 
                    type="range" min="10" max="80" 
                    value={localSettings[key as keyof VisualSettings] as number}
                    onChange={(e) => updateSetting(key as keyof VisualSettings, parseInt(e.target.value))}
                    className="w-full accent-red-600 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em] flex items-center gap-2">
              <Globe size={14} /> Integración Make
            </h3>
            <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
              <p className="text-[10px] font-black uppercase opacity-40">URL Webhook</p>
              <div className="flex gap-2">
                <code className="flex-1 p-4 bg-black rounded-xl text-[10px] font-mono text-red-400 truncate border border-white/5">{webhookUrl}</code>
                <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="p-4 bg-red-600 rounded-xl hover:scale-95 transition-all"><Clipboard size={16} /></button>
              </div>
            </div>
          </section>
        </div>

        <div className="p-10 border-t border-white/5 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Cerrar Ajustes</button>
        </div>
      </div>
    </div>
  );
};
