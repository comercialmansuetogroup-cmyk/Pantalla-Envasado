
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
  
  const [settings, setSettings] = useState<any>(() => {
    const saved = localStorage.getItem('factory_settings_v14');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) { setData([]); return; }
      const raw = await res.json();
      
      // Transform raw DB data to grouped client data
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
          trend: 0 // In a real app, this comes from a comparision with yesterday's data
        });
      });

      setData(Object.values(groups).sort((a,b) => {
        if(a.name === 'GRAN CANARIA') return -1;
        return a.name.localeCompare(b.name);
      }));
    } catch (e) { 
      console.error(e);
      setData([]);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      fetchData();
      try {
        const msg = JSON.parse(e.data);
        if (msg.code) {
          setHighlightedCode(msg.code);
          setTimeout(() => setHighlightedCode(null), 3000);
        }
      } catch(err) {}
    };
    return () => es.close();
  }, [fetchData]);

  const globalTotal = useMemo(() => {
    return data.reduce((acc, client) => acc + client.products.reduce((pAcc, p) => pAcc + p.qty, 0), 0);
  }, [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-[#0a0c10] text-white' : 'bg-slate-50 text-slate-900'}`}>
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
        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto items-start custom-scroll">
            {data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-4xl uppercase tracking-[1em]">Sin Datos Activos</div>
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
          localStorage.setItem('factory_settings_v14', JSON.stringify(s));
        }}
      />
    </div>
  );
}
