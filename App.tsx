
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { LiveDashboard } from './components/LiveDashboard.tsx';
import { StatsDashboard } from './components/StatsDashboard.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { processIncomingData } from './services/dataProcessor.ts';
import { Server, Radio, Clock, Database, Loader2 } from 'lucide-react';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  // Fix: Explicitly type the currentView state to match the Header component's 'live' | 'stats' type.
  const [currentView, setCurrentView] = useState<'live' | 'stats'>('live'); 
  const [clientGroups, setClientGroups] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const isFetchingRef = useRef(false);

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error("Servidor no responde");
      
      const data = await response.json();
      
      if (data && data.zonas && Array.isArray(data.zonas)) {
        const processed = processIncomingData(data);
        setClientGroups(processed);
        setLastUpdated(new Date());
        setError(null);
      } else if (!clientGroups.length) {
        setError("SISTEMA ACTIVO: Esperando primer envío desde Make...");
      }
    } catch (err) {
      setError("ERROR: El servidor de Railway no responde.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000); 
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <Header 
        darkMode={darkMode} 
        toggleTheme={() => setDarkMode(!darkMode)} 
        currentView={currentView}
        setView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="p-8 max-w-[2400px] mx-auto w-full">
        {/* Status Bar */}
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 px-8 py-4 bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${clientGroups.length > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${clientGroups.length > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <Server size={12} className="text-red-600" />
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  {clientGroups.length > 0 ? 'Data Stream: Active' : 'Data Stream: Waiting'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {loading && <Loader2 size={14} className="animate-spin text-red-600" />}
            {lastUpdated && (
              <div className="flex items-center gap-3 px-4 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                <Clock size={12} className="text-green-500" />
                <span className="text-[10px] font-bold text-green-500 uppercase tabular-nums">
                  Sync: {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 opacity-40">
              <Database size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest text-red-600">PRODUCTION_V3</span>
            </div>
          </div>
        </div>

        {clientGroups.length === 0 ? (
          <div className="mt-24 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            <div className="relative">
               <div className="absolute inset-0 bg-red-600 blur-[40px] opacity-10 rounded-full animate-pulse"></div>
               <div className="relative w-24 h-24 bg-red-600/10 rounded-[2rem] flex items-center justify-center text-red-600 border border-red-600/20 shadow-xl">
                 <Radio size={40} className="animate-pulse" />
               </div>
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">Consola de Recepción</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium px-6 uppercase tracking-wider">
                {error || "El sistema está listo. Envía un POST desde Make para visualizar la producción."}
              </p>
            </div>
          </div>
        ) : (
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
      />
    </div>
  );
}
