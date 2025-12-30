import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { LiveDashboard } from './components/LiveDashboard.tsx';
import { StatsDashboard } from './components/StatsDashboard.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { processIncomingData } from './services/dataProcessor.ts';
import { ClientGroup } from './types.ts';
import { Server, Radio, Clock, Database, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<'live' | 'stats'>('live');
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const isFetchingRef = useRef(false);

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error("Servidor no responde");
      
      const data = await response.json();
      
      if (data && data.zonas) {
        const processed = processIncomingData(data);
        setClientGroups(processed);
        setLastUpdated(new Date());
        setError(null);
      } else {
        if (clientGroups.length === 0) {
          setError("EN LÍNEA: Esperando primera señal de Make...");
        }
      }
    } catch (err: any) {
      setError("ERROR DE RED: Comprueba la conexión con Railway.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 4000); 
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <Header 
        darkMode={darkMode} 
        toggleTheme={() => setDarkMode(!darkMode)} 
        currentView={currentView}
        setView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="p-8 max-w-[2400px] mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 px-8 py-4 bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="relative flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${error ? 'bg-amber-500' : 'bg-green-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-4 w-4 ${error ? 'bg-amber-500' : 'bg-green-500'}`}></span>
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <Server size={14} className="text-red-600" />
                <span className="text-sm font-black tracking-tight uppercase">
                  {error ? 'Status: Standby' : 'Status: Conectado'}
                </span>
              </div>
              <span className="text-[10px] opacity-40 uppercase tracking-[0.2em] font-black">
                PRODUCCIÓN REAL-TIME V3
              </span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {loading && <Loader2 size={16} className="animate-spin text-red-600" />}
            {lastUpdated && (
              <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20">
                <Clock size={14} className="text-green-500" />
                <span className="text-[11px] font-black text-green-500 uppercase tabular-nums">
                  Sync: {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 opacity-60">
              <Database size={14} />
              <span className="text-[11px] font-black uppercase tracking-wider">Railway Engine</span>
            </div>
          </div>
        </div>

        {clientGroups.length === 0 && (
          <div className="mt-20 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in-up">
            <div className="relative">
               <div className="absolute inset-0 bg-red-600 blur-[60px] opacity-20 rounded-full animate-pulse"></div>
               <div className="relative w-32 h-32 bg-red-600/10 rounded-[3rem] flex items-center justify-center text-red-600 border border-red-600/20 shadow-2xl">
                 <Radio size={56} className="animate-pulse" />
               </div>
            </div>
            <div className="max-w-md space-y-3">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Esperando Datos de Make</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium px-4">
                {error || "Todo está listo. Lanza el escenario en Make para empezar a ver los pedidos en tiempo real."}
              </p>
              <div className="pt-6">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-8 py-3 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Configurar Make HTTP
                </button>
              </div>
            </div>
          </div>
        )}

        {clientGroups.length > 0 && (
          <div className="animate-fade-in">
            {currentView === 'live' ? (
              <LiveDashboard data={clientGroups} darkMode={darkMode} />
            ) : (
              <StatsDashboard data={clientGroups} darkMode={darkMode} onBack={() => setCurrentView('live')} />
            )}
          </div>
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={{} as any}
        onSave={() => {}}
      />
    </div>
  );
};

export default App;
