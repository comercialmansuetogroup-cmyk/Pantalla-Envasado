
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header.tsx';
import { ClientColumn } from './components/ClientColumn.tsx';
import { StatsDashboard } from './components/StatsDashboard.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { DEFAULT_SETTINGS } from './types.ts';
import { Trash2 } from 'lucide-react';
import type { VisualSettings } from './types.ts';

export default function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<VisualSettings>(() => {
    const saved = localStorage.getItem('factory_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error("Server response error");
      const json = await res.json();
      // SEGURO: Solo guardamos si es un array
      if (Array.isArray(json)) {
        setData(json);
      } else {
        console.error("Data received is not an array:", json);
        setData([]);
      }
    } catch (e) { 
      console.error("Error fetching data:", e);
      setData([]); // Reset para evitar crash
    }
  }, []);

  useEffect(() => {
    fetchData();
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      fetchData();
      try {
        const msg = JSON.parse(e.data);
        if (msg.updatedCode) {
          setHighlightedCode(msg.updatedCode);
          setTimeout(() => setHighlightedCode(null), 3000);
        }
      } catch(err) {}
    };
    return () => es.close();
  }, [fetchData]);

  // SEGURO: Verificar que 'data' sea array antes de .reduce
  const globalTotal = useMemo(() => {
    if (!Array.isArray(data)) return 0;
    return data.reduce((acc, client) => {
      const clientProducts = Array.isArray(client.products) ? client.products : [];
      return acc + clientProducts.reduce((pAcc, p) => pAcc + Number(p.cantidad || 0), 0);
    }, 0);
  }, [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        view={view} 
        setView={setView} 
        onSettings={() => setIsSettingsOpen(true)}
        total={globalTotal}
      />

      <main className="flex-1 relative overflow-hidden">
        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto p-10 gap-10 items-start custom-scroll-horizontal">
            {!Array.isArray(data) || data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-4xl uppercase tracking-[1em]">
                Esperando Datos...
              </div>
            ) : (
              data.map((client) => (
                <ClientColumn 
                  key={client.name} 
                  group={{
                    name: client.name,
                    code: client.code,
                    products: Array.isArray(client.products) ? client.products : []
                  }} 
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
          localStorage.setItem('factory_settings', JSON.stringify(s));
        }}
      />
    </div>
  );
}
