
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header.tsx';
import { ClientColumn } from './components/ClientColumn.tsx';
import { StatsDashboard } from './components/StatsDashboard.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { DEFAULT_SETTINGS, CLIENT_MAPPING } from './types.ts';

export default function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  
  const [settings, setSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('factory_settings_v18');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const fetchData = useCallback(async () => {
    try {
      setIsConnecting(true);
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('API Unreachable');
      const raw = await res.json();
      
      const groups: Record<string, any> = {};
      raw.forEach((row: any) => {
        const clientName = CLIENT_MAPPING[row.agent_code] || row.agent_name || `ZONA ${row.agent_code}`;
        if (!groups[clientName]) {
          groups[clientName] = { name: clientName, products: [] };
        }
        groups[clientName].products.push({
          code: row.product_code,
          name: row.product_name,
          qty: Number(row.total_qty),
          stock: Number(row.stock),
          trend: Math.floor(Math.random() * 20) - 5 // Tendencia simulada si no viene de DB
        });
      });

      setData(Object.values(groups).sort((a,b) => {
        if(a.name === 'GRAN CANARIA') return -1;
        if(b.name === 'GRAN CANARIA') return 1;
        return a.name.localeCompare(b.name);
      }));
      setErrorCount(0);
    } catch (e) { 
      console.warn('Fetch error:', e);
      setErrorCount(prev => prev + 1);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    let es: EventSource | null = null;
    
    const connectSSE = () => {
      if (es) es.close();
      es = new EventSource('/api/events');
      
      es.onmessage = (e) => {
        // Limpieza de caracteres de control y validación de JSON
        const rawData = e.data?.trim();
        if (!rawData) return;
        
        try {
          const msg = JSON.parse(rawData);
          fetchData();
          if (msg.code) {
            setHighlightedCode(msg.code);
            setTimeout(() => setHighlightedCode(null), 6000);
          }
        } catch(err) {
          // Ignorar chunks malformados que a veces llegan del proxy
        }
      };

      es.onerror = () => {
        es?.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();
    const interval = setInterval(fetchData, 15000);

    return () => {
      es?.close();
      clearInterval(interval);
    };
  }, [fetchData]);

  const globalTotal = useMemo(() => {
    return data.reduce((acc, client) => acc + client.products.reduce((pAcc, p) => pAcc + p.qty, 0), 0);
  }, [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-[#080a0f] text-white' : 'bg-slate-100 text-slate-900'}`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        view={view} 
        setView={setView} 
        onSettings={() => setIsSettingsOpen(true)}
        total={globalTotal}
        settings={settings}
      />

      {errorCount > 0 && (
        <div className="absolute top-52 left-1/2 -translate-x-1/2 bg-red-600 text-white px-12 py-4 rounded-sm text-[12px] font-black uppercase tracking-[0.4em] z-[150] shadow-2xl animate-pulse flex items-center gap-4">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          PÉRDIDA DE SEÑAL - REINTENTO #{errorCount}
        </div>
      )}

      <main className="flex-1 relative overflow-hidden">
        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto items-start custom-scroll">
            {data.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-10 font-black">
                <p className="text-9xl uppercase tracking-[1em] italic">ANSUETO HUB</p>
                <p className="text-xl tracking-[0.8em] mt-16 uppercase text-red-600">Sincronizando flujo de producción industrial...</p>
              </div>
            ) : (
              data.map((client) => (
                <ClientColumn 
                  key={client.name} 
                  group={client} 
                  darkMode={darkMode} 
                  settings={settings}
                  highlightedCode={highlightedCode}
                />
              ))
            )}
          </div>
        ) : (
          <StatsDashboard darkMode={darkMode} />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        visualSettings={settings}
        onSaveSettings={(s) => {
          setSettings(s);
          localStorage.setItem('factory_settings_v18', JSON.stringify(s));
        }}
      />
    </div>
  );
}
