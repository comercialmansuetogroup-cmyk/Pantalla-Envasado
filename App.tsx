
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
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('factory_settings_v16');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Network error');
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
          trend: 0 
        });
      });

      setData(Object.values(groups).sort((a,b) => {
        if(a.name === 'GRAN CANARIA') return -1;
        if(b.name === 'GRAN CANARIA') return 1;
        return a.name.localeCompare(b.name);
      }));
      setError(null);
    } catch (e) { 
      console.warn('Fetch error:', e);
      setError('Error conectando con el servidor. Reintentando...');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const es = new EventSource('/api/events');
    
    es.onmessage = (e) => {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        fetchData();
        if (msg.code) {
          setHighlightedCode(msg.code);
          setTimeout(() => setHighlightedCode(null), 4000);
        }
      } catch(err) {
        // Silently skip malformed JSON from stream
      }
    };

    es.onerror = () => {
      console.log('SSE Reconnecting...');
    };

    const interval = setInterval(fetchData, 10000);
    return () => {
      es.close();
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

      {error && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-widest z-[150] shadow-xl">
          {error}
        </div>
      )}

      <main className="flex-1 relative overflow-hidden">
        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto items-start custom-scroll">
            {data.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-10 font-black">
                <p className="text-6xl uppercase tracking-[1em] italic">Esperando Datos</p>
                <p className="text-xs tracking-[0.5em] mt-8 uppercase">Sincronización de Planta v16</p>
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
          localStorage.setItem('factory_settings_v16', JSON.stringify(s));
        }}
      />
    </div>
  );
}
