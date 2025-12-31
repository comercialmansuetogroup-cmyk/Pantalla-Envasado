
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ClientColumn } from './components/ClientColumn';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { DEFAULT_SETTINGS, CLIENT_MAPPING } from './types';

export default function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(false);
  
  const [data, setData] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('factory_settings_v20');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const fetchData = useCallback(async () => {
    try {
      setIsConnecting(true);
      setErrorMsg(null);
      
      const res = await fetch('/api/data');
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid Server Response: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      
      const raw = await res.json();
      
      const groups: Record<string, any> = {};
      if (Array.isArray(raw)) {
        raw.forEach((row: any) => {
          const clientName = CLIENT_MAPPING[row.agent_code] || row.agent_name || `ZONA ${row.agent_code}`;
          if (!groups[clientName]) {
            groups[clientName] = { name: clientName, products: [] };
          }
          
          const existingProd = groups[clientName].products.find((p: any) => p.code === row.product_code);
          
          if (existingProd) {
             existingProd.qty += Number(row.total_qty);
          } else {
            groups[clientName].products.push({
              code: row.product_code,
              name: row.product_name,
              qty: Number(row.total_qty),
              stock: Number(row.stock),
              trend: 0
            });
          }
        });
      }

      setData(Object.values(groups).sort((a,b) => {
        if(a.name === 'GRAN CANARIA') return -1;
        if(b.name === 'GRAN CANARIA') return 1;
        return a.name.localeCompare(b.name);
      }));
    } catch (e: any) { 
      console.warn('Connection failed:', e);
      setErrorMsg(e.message || 'Connection Error');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;
    
    const connectSSE = () => {
      if (es) es.close();
      es = new EventSource('/api/events');
      
      es.onopen = () => {
        setErrorMsg(null);
      };

      es.onmessage = (e) => {
        if (e.data === ':' || e.data.trim() === '') return;
        
        const rawData = e.data?.trim();
        if (!rawData) return;
        
        try {
          const msg = JSON.parse(rawData);
          fetchData();
          if (msg.code) {
            setHighlightedCode(msg.code);
            setTimeout(() => setHighlightedCode(null), 6000);
          }
        } catch(err) {}
      };

      es.onerror = (err) => {
        es?.close();
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();
    
    const interval = setInterval(fetchData, 15000);

    return () => {
      if (es) es.close();
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchData]);

  const globalTotal = useMemo(() => {
    return data.reduce((acc, client) => acc + client.products.reduce((pAcc: number, p: any) => pAcc + p.qty, 0), 0);
  }, [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#080a0f] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        view={view} 
        setView={setView} 
        onSettings={() => setIsSettingsOpen(true)}
        total={globalTotal}
        settings={settings}
      />

      <main className="flex-1 relative overflow-hidden">
        {errorMsg && (
          <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black uppercase text-center py-1 z-50">
             {errorMsg} - Retrying...
          </div>
        )}

        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto items-start custom-scroll">
            {data.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-20 font-black text-slate-500">
                <p className="text-4xl uppercase tracking-[0.5em] italic">
                   {isConnecting ? 'SINCRONIZANDO...' : 'ESPERANDO DATOS...'}
                </p>
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
          <StatsDashboard darkMode={darkMode} data={data} />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        visualSettings={settings}
        onSaveSettings={(s) => {
          setSettings(s);
          localStorage.setItem('factory_settings_v20', JSON.stringify(s));
        }}
      />
    </div>
  );
}
