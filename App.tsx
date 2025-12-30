import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Factory, Moon, Sun, Clock, Radio, LayoutDashboard, BarChart3, Settings, Server, Database
} from 'lucide-react';

import { ClientColumn } from './components/ClientColumn';
import { SettingsModal } from './components/SettingsModal';
import { StatsDashboard } from './components/StatsDashboard';
import { processDataWithTrends, roundSafe } from './utils';
import { DEFAULT_SETTINGS, VisualSettings } from './types';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(() => {
    const saved = localStorage.getItem('factoryFlow_visualSettings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  // Lógica de animación de items completados
  const handleCompletedItems = useCallback((newGroups: any[]) => {
      newGroups.forEach(client => {
          client.productsArray.forEach((p: any) => {
              if (p.toProduce <= 0) {
                  setCompletedItems(prev => {
                      if (!prev.has(p.rowId)) {
                          const newSet = new Set(prev);
                          newSet.add(p.rowId);
                          setTimeout(() => {
                              setCompletedItems(current => {
                                  const updated = new Set(current);
                                  updated.delete(p.rowId);
                                  return updated;
                              });
                          }, 3000);
                          return newSet;
                      }
                      return prev;
                  });
              }
          });
      });
  }, []);

  const updateVisualSettings = (newSettings: VisualSettings) => {
    setVisualSettings(newSettings);
    localStorage.setItem('factoryFlow_visualSettings', JSON.stringify(newSettings));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/data?t=${Date.now()}`);
      if (!res.ok) throw new Error("Sync Fail");
      const json = await res.json();
      if (json && json.zonas) {
        setRawData(json.zonas);
        setLastSync(new Date());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // Conexión SSE
  useEffect(() => {
    fetchData();
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
            fetchData();
            if (data.updatedCode) {
                setHighlightedCode(data.updatedCode);
                setTimeout(() => setHighlightedCode(null), 3000);
            }
        } else if (data.type === 'sys_log') {
            const time = new Date(data.timestamp).toLocaleTimeString();
            setSystemLogs(prev => [`[${time}] ${data.message}`, ...prev].slice(0, 50));
        }
    };
    return () => eventSource.close();
  }, [fetchData]);

  const clientGroups = useMemo(() => {
      const groups = processDataWithTrends(rawData, completedItems);
      handleCompletedItems(groups);
      return groups;
  }, [rawData, completedItems, handleCompletedItems]);

  const totalGlobal = useMemo(() => roundSafe(clientGroups.reduce((acc, c) => acc + (c.total || 0), 0)), [clientGroups]);
  const currentLogo = darkMode ? visualSettings.logoDark : visualSettings.logoLight;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex-none w-full px-10 py-3 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-6">
            {currentLogo ? (
               <img src={currentLogo} alt="Logo" className="h-16 w-auto object-contain max-w-[300px]" />
            ) : (
              <>
                <div className="bg-red-600 p-2.5 rounded-xl shadow-lg shadow-red-600/20">
                  <Factory size={26} className="text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-black tracking-tighter uppercase leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>Factory<span className="text-red-600">Flow</span></h2>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-1 italic">Producción de Pedidos en Vivo</p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner">
              <button onClick={() => setView('live')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'live' ? 'bg-red-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-500'}`}>
                <LayoutDashboard size={14} /> PEDIDOS
              </button>
              <button onClick={() => setView('stats')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'stats' ? 'bg-red-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-500'}`}>
                <BarChart3 size={14} /> ANALÍTICA
              </button>
            </div>

            <div className="flex flex-col items-end pr-8 border-r border-white/10">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">PRODUCCIÓN GLOBAL</span>
               <span className="text-4xl font-black text-red-600 leading-none tracking-tighter tabular-nums">
                {totalGlobal.toLocaleString('es-ES')}
               </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-md text-slate-400 hover:text-white"><Settings size={20} /></button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-md">
                {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-700" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden">
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-6 py-2 bg-white/5 dark:bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 shadow-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
           <div className="flex items-center gap-2">
             <Server size={10} className={rawData.length > 0 ? "text-green-500" : "text-amber-500"} />
             <span className="text-[9px] font-black uppercase text-slate-400">Stream Status: {rawData.length > 0 ? 'ACTIVE' : 'IDLE'}</span>
           </div>
           {lastSync && (
             <div className="flex items-center gap-2 border-l border-white/10 pl-4">
               <Clock size={10} className="text-blue-500" />
               <span className="text-[9px] font-bold text-slate-400">{lastSync.toLocaleTimeString()}</span>
             </div>
           )}
        </div>

        {rawData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 opacity-40">
            <div className="p-10 bg-red-600/5 rounded-full border border-red-600/10 animate-pulse">
              <Radio size={80} className="text-red-600" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-[1em] text-slate-500">Sincronizando...</h2>
          </div>
        ) : (
          view === 'live' ? (
            <div className="flex w-full h-full animate-fade-in divide-x divide-white/5 overflow-x-auto overflow-y-hidden">
              {clientGroups.map((g) => (
                  <ClientColumn 
                    key={g.name} 
                    data={g} 
                    darkMode={darkMode} 
                    settings={visualSettings} 
                    highlightedCode={highlightedCode}
                  />
              ))}
            </div>
          ) : (
            <StatsDashboard data={clientGroups} darkMode={darkMode} onBack={() => setView('live')} />
          )
        )}
      </main>

      <footer className={`flex-none px-10 py-2.5 border-t flex justify-between items-center text-[9px] font-black uppercase tracking-[0.5em] ${darkMode ? 'bg-slate-900 border-white/5 text-slate-700' : 'bg-slate-200 border-gray-300 text-slate-500'}`}>
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
          NÚCLEO ONLINE • {clientGroups.length} NODOS
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 opacity-40 italic"><Database size={12} /> SYNC_PRO_VERSION</div>
          {lastSync && <div className="flex items-center gap-3 text-slate-500 font-bold"><Clock size={14} /> ÚLTIMA SYNC: {lastSync.toLocaleTimeString()}</div>}
        </div>
      </footer>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        visualSettings={visualSettings} 
        onSaveSettings={updateVisualSettings} 
        systemLogs={systemLogs}
      />
    </div>
  );
}