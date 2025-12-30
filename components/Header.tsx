import React from 'react';
import { Factory, Moon, Sun, BarChart2, LayoutDashboard, Settings } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  toggleTheme: () => void;
  currentView: 'live' | 'stats';
  setView: (view: 'live' | 'stats') => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, toggleTheme, currentView, setView, onOpenSettings }) => {
  return (
    <header className={`
      sticky top-0 z-50 w-full px-6 py-4 shadow-md transition-colors duration-300
      ${darkMode ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-gray-200'}
    `}>
      <div className="flex items-center justify-between max-w-[2000px] mx-auto">
        
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-600/20">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              FACTORY<span className="text-red-600">OPS</span>
            </h1>
            <span className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Control de Producción
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          
          {/* View Switcher */}
          <div className={`hidden md:flex p-1 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
            <button
              onClick={() => setView('live')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all
                ${currentView === 'live' 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}
              `}
            >
              <LayoutDashboard size={18} />
              <span>Pedidos</span>
            </button>
            <button
              onClick={() => setView('stats')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all
                ${currentView === 'stats' 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}
              `}
            >
              <BarChart2 size={18} />
              <span>Estadísticas</span>
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`
              p-3 rounded-full transition-colors border
              ${darkMode 
                ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' 
                : 'bg-white border-gray-200 text-slate-700 hover:bg-gray-50'}
            `}
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`
              p-3 rounded-full transition-colors border
              ${darkMode 
                ? 'bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700 hover:text-white' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black'}
            `}
            aria-label="Configuración"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
