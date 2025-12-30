import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, Radio, Server, Clock, Database } from 'lucide-react';
import { Header } from './components/Header';
import { LiveDashboard } from './components/LiveDashboard';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { processIncomingData } from './services/dataProcessor';
import { ClientGroup, AppSettings } from './types';

// El API Key se usa para la validación del Bearer en el servidor local
const RAILWAY_KEY = (import.meta as any).env?.VITE_MAKE_API_KEY || '';

const DEFAULT_SETTINGS: AppSettings = {
  webhookUrl: '/api/data', 
  apiKey: RAILWAY_KEY,
  region: 'local',
  refreshRate: 5, 
  useMockData: false, 
  useProxy: false, 
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<'live' | 'stats'>('live');
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error("No se pudo conectar con el servidor interno de Railway.");
      
      const data = await response.json();
      
      if (!data || !data.zonas) {
        // Estado de espera: El servidor está vivo pero no ha recibido nada de Make aún
        if (clientGroups.length === 0) {
           setError("ESPERANDO DATOS: Configure el módulo HTTP en Make para iniciar la transmisión.");
        }
        return;
      }

      setError(null);
      const processed = processIncomingData(data);
      setClientGroups(processed);
      setLastUpdated(new Date());

    } catch (err: any) {
      setError(`ERROR DE SISTEMA: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [loading, clientGroups.length]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, settings.refreshRate * 1000);
    return () => clearInterval(intervalId);
  }, [fetchData, settings.refreshRate]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <Header 
        darkMode={darkMode} 
        toggleTheme={() => setDarkMode(!darkMode)} 
        currentView={currentView}
        setView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="p-8 max-w-[2400px] mx-auto w-full relative">
        
        {/* Connection Status Bar */}
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 px-8 py-4 bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="relative flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${error ? 'bg-amber-500' : 'bg-green-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-4 w-4 ${error ? 'bg-amber-500' : 'bg-green-500'}`}></span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Server size={14} className="text-red-600" />
                <span className="text-sm font-black tracking-tight uppercase">
                  {error ? 'Sincronización en Espera' : 'Servidor Activo y Escuchando'}
                </span>
              </div>
              <span className="text-[10px] opacity-40 uppercase tracking-[0.2em] font-black">
                Punto de Enlace: Railway Webhook API
              </span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {lastUpdated && (
              <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20">
                <Clock size={14} className="text-green-500" />
                <span className="text-[11px] font-black text-green-500 uppercase tabular-nums">
                  Último Lote: {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 opacity-60">
              <Database size={14} />
              <span className="text-[11px] font-black uppercase tracking-wider">Refresco: {settings.refreshRate}s</span>
            </div>
          </div>
        </div>

        {/* Empty State / Error Notification */}
        {error && clientGroups.length === 0 && (
          <div className="mt-12 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in-up">
            <div className="w-24 h-24 bg-red-600/10 rounded-[2.5rem] flex items-center justify-center text-red-600 border border-red-600/20 shadow-2xl shadow-red-600/10">
              <Radio size={48} className="animate-pulse" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">Panel sin Señal</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                {error}
                <br />
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="mt-4 text-red-600 font-black uppercase tracking-widest text-xs hover:underline"
                >
                  Abrir Guía de Conexión →
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Main Dashboards */}
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
        currentSettings={settings}
        onSave={(s) => setSettings(s)}
      />
    </div>
  );
};

export default App;
