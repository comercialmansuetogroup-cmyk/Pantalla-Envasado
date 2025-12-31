
import React from 'react';
import { Factory, Sun, Moon, Layout, BarChart, Settings } from 'lucide-react';

export const Header = ({ darkMode, setDarkMode, view, setView, onSettings, total }) => {
  return (
    <header className="flex-none h-24 flex items-center justify-between px-10 border-b bg-black/20 backdrop-blur-xl border-white/10">
      <div className="flex items-center gap-6">
        <div className="bg-red-600 p-3 rounded-2xl animate-pulse shadow-2xl shadow-red-600/50">
          <Factory color="white" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Factory<span className="text-red-600">Sync</span></h1>
          <span className="text-[9px] font-black opacity-40 tracking-[0.4em]">POSTGRES REAL-TIME V4</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button onClick={() => setView('live')} className={`px-6 py-2 rounded-xl flex items-center gap-2 text-xs font-black transition-all ${view === 'live' ? 'bg-red-600 text-white' : 'hover:bg-white/10 opacity-50'}`}>
            <Layout size={14} /> EN VIVO
          </button>
          <button onClick={() => setView('stats')} className={`px-6 py-2 rounded-xl flex items-center gap-2 text-xs font-black transition-all ${view === 'stats' ? 'bg-red-600 text-white' : 'hover:bg-white/10 opacity-50'}`}>
            <BarChart size={14} /> ESTADÍSTICAS
          </button>
        </div>

        <div className="flex flex-col items-end pr-6 border-r border-white/10 mr-2">
          <span className="text-[8px] font-black opacity-30 uppercase">Total Global</span>
          <span className="text-4xl font-black text-red-600 tabular-nums leading-none">{total}</span>
        </div>

        <button onClick={onSettings} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-red-600 transition-colors">
          <Settings size={20} />
        </button>
        <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-white/5 rounded-xl border border-white/10">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};
