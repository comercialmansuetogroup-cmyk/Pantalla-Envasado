
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
    <header className="flex-none h-48 flex items-center justify-between px-16 border-b border-white/5 bg-[#080a0f] z-[100] shadow-2xl">
      <div className="flex items-center gap-16 h-full">
        <div className="flex items-center">
          {logo ? (
            <img src={logo} className="h-36 object-contain max-w-[650px] w-auto transition-all" alt="Company Logo" />
          ) : (
            <div className="font-black text-8xl tracking-tighter italic select-none">
              AN<span className="text-red-600">SUETO</span>
            </div>
          )}
        </div>
        <div className="h-24 w-px bg-white/10 hidden 2xl:block"></div>
        <div className="hidden 2xl:block">
          <h1 className="text-2xl font-black uppercase tracking-[0.5em] leading-none text-white/90">Sistema de Control</h1>
          <span className="text-[14px] font-bold opacity-30 tracking-[0.8em] uppercase mt-3 block text-red-600">Real-Time V18 Engine</span>
        </div>
      </div>

      <div className="flex items-center gap-16">
        <div className="flex bg-white/5 p-2 border border-white/10 rounded-sm">
          <button 
            onClick={() => setView('live')} 
            className={`px-16 py-5 text-[14px] font-black uppercase transition-all flex items-center gap-3 ${view === 'live' ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'opacity-40 hover:opacity-100'}`}
          >
            <Layout size={20} /> PEDIDOS
          </button>
          <button 
            onClick={() => setView('stats')} 
            className={`px-16 py-5 text-[14px] font-black uppercase transition-all flex items-center gap-3 ${view === 'stats' ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'opacity-40 hover:opacity-100'}`}
          >
            <BarChart size={20} /> ANALÍTICA
          </button>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[16px] font-black opacity-40 uppercase tracking-[0.6em] mb-2">Producción Global</span>
          <span className="text-[140px] font-black text-red-600 tabular-nums leading-none tracking-tighter drop-shadow-[0_0_45px_rgba(220,38,38,0.6)]">
            {total.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-6 pl-12 border-l border-white/10">
          <button onClick={onSettings} className="p-6 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <Settings size={36} />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-6 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            {darkMode ? <Sun size={36} className="text-yellow-400" /> : <Moon size={36} />}
          </button>
        </div>
      </div>
    </header>
  );
};
