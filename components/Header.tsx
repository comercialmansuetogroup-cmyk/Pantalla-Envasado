
import React from 'react';
import { Layout, BarChart, Settings, Trash2 } from 'lucide-react';
import { VisualSettings } from '../types';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  view: 'live' | 'stats';
  setView: (val: 'live' | 'stats') => void;
  onSettings: () => void;
  total: number;
  settings: VisualSettings;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, setDarkMode, view, setView, onSettings, total, settings }) => {
  const logo = darkMode ? settings.logoDark : settings.logoLight;

  return (
    <header className="flex-none h-20 flex items-center justify-between px-10 border-b border-white/5 bg-[#0a0c10] z-[100]">
      <div className="flex items-center gap-10 h-full">
        {logo ? (
          <img src={logo} className="h-12 object-contain max-w-[280px]" alt="Logo" />
        ) : (
          <div className="font-black text-3xl tracking-tighter">AN<span className="text-red-600">SUETO</span></div>
        )}
        <div className="h-8 w-px bg-white/10 hidden lg:block"></div>
        <div className="hidden lg:block">
          <h1 className="text-sm font-black uppercase tracking-[0.2em] leading-none">Control de Planta</h1>
          <span className="text-[8px] font-bold opacity-30 tracking-[0.5em] uppercase">Real-Time V14 Engine</span>
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="flex bg-white/5 p-1 border border-white/10">
          <button 
            onClick={() => setView('live')} 
            className={`px-8 py-2 text-[10px] font-black uppercase transition-all flex items-center gap-2 ${view === 'live' ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}
          >
            <Layout size={12} /> PEDIDOS
          </button>
          <button 
            onClick={() => setView('stats')} 
            className={`px-8 py-2 text-[10px] font-black uppercase transition-all flex items-center gap-2 ${view === 'stats' ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}
          >
            <BarChart size={12} /> ANALÍTICA
          </button>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">Global Production</span>
          <span className="text-4xl font-black text-red-600 tabular-nums leading-none tracking-tighter">{total.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onSettings}
            className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-yellow-400' : 'bg-slate-400'}`}></div>
          </button>
        </div>
      </div>
    </header>
  );
};
