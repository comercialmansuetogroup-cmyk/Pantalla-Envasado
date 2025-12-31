
import React from 'react';
import { Layout, BarChart, Settings, Sun, Moon } from 'lucide-react';
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
    <header className="flex-none h-24 flex items-center justify-between px-12 border-b border-white/5 bg-[#0a0c10] z-[100]">
      <div className="flex items-center gap-12 h-full">
        <div className="flex items-center min-w-[300px]">
          {logo ? (
            <img src={logo} className="h-16 object-contain max-w-[400px]" alt="Ansueto" />
          ) : (
            <div className="font-black text-4xl tracking-tighter italic">AN<span className="text-red-600">SUETO</span></div>
          )}
        </div>
        <div className="h-10 w-px bg-white/10 hidden xl:block"></div>
        <div className="hidden xl:block">
          <h1 className="text-sm font-black uppercase tracking-[0.3em] leading-none text-white/90">Sistema de Control Industrial</h1>
          <span className="text-[9px] font-bold opacity-20 tracking-[0.6em] uppercase mt-1 block">Real-Time V15 Engine</span>
        </div>
      </div>

      <div className="flex items-center gap-12">
        <div className="flex bg-white/5 p-1 border border-white/10 rounded-sm">
          <button 
            onClick={() => setView('live')} 
            className={`px-10 py-2.5 text-[11px] font-black uppercase transition-all flex items-center gap-2 ${view === 'live' ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}
          >
            <Layout size={14} /> PEDIDOS
          </button>
          <button 
            onClick={() => setView('stats')} 
            className={`px-10 py-2.5 text-[11px] font-black uppercase transition-all flex items-center gap-2 ${view === 'stats' ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}
          >
            <BarChart size={14} /> ANALÍTICA
          </button>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">Producción Global</span>
          <span className="text-6xl font-black text-red-600 tabular-nums leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            {total.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <button onClick={onSettings} className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <Settings size={22} />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            {darkMode ? <Sun size={22} className="text-yellow-400" /> : <Moon size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
};
