
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
    <header className="flex-none h-32 flex items-center justify-between px-14 border-b border-white/5 bg-[#080a0f] z-[100] shadow-2xl">
      <div className="flex items-center gap-14 h-full">
        <div className="flex items-center">
          {logo ? (
            <img src={logo} className="h-24 object-contain max-w-[500px] w-auto transition-all" alt="Ansueto" />
          ) : (
            <div className="font-black text-6xl tracking-tighter italic select-none">
              AN<span className="text-red-600">SUETO</span>
            </div>
          )}
        </div>
        <div className="h-14 w-px bg-white/10 hidden xl:block"></div>
        <div className="hidden xl:block">
          <h1 className="text-base font-black uppercase tracking-[0.4em] leading-none text-white/90">Control Industrial</h1>
          <span className="text-[10px] font-bold opacity-20 tracking-[0.7em] uppercase mt-2 block">Real-Time V16 Engine</span>
        </div>
      </div>

      <div className="flex items-center gap-14">
        <div className="flex bg-white/5 p-1.5 border border-white/10 rounded-sm">
          <button 
            onClick={() => setView('live')} 
            className={`px-12 py-3 text-[12px] font-black uppercase transition-all flex items-center gap-2 ${view === 'live' ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}
          >
            <Layout size={16} /> PEDIDOS
          </button>
          <button 
            onClick={() => setView('stats')} 
            className={`px-12 py-3 text-[12px] font-black uppercase transition-all flex items-center gap-2 ${view === 'stats' ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}
          >
            <BarChart size={16} /> ANALÍTICA
          </button>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[12px] font-black opacity-30 uppercase tracking-[0.4em] mb-1">Producción Global</span>
          <span className="text-8xl font-black text-red-600 tabular-nums leading-none tracking-tighter drop-shadow-[0_0_25px_rgba(220,38,38,0.4)]">
            {total.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-4 pl-8 border-l border-white/10">
          <button onClick={onSettings} className="p-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <Settings size={26} />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            {darkMode ? <Sun size={26} className="text-yellow-400" /> : <Moon size={26} />}
          </button>
        </div>
      </div>
    </header>
  );
};
