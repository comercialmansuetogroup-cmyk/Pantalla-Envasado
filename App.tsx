
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
      if (!res.ok) {
        console.warn("Servidor devolvió error 500, reintentando...");
        setData([]);
        return;
      }
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(json);
      } else {
        setData([]);
      }
    } catch (e) { 
      console.error("Error fetching data:", e);
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
        if (msg.updatedCode) {
          setHighlightedCode(msg.updatedCode);
          setTimeout(() => setHighlightedCode(null), 3000);
        }
      } catch(err) {}
    };
    es.onerror = () => {
      console.log("EventSource reconectando...");
    };
    return () => es.close();
  }, [fetchData]);

  const globalTotal = useMemo(() => {
    if (!Array.isArray(data)) return 0;
    return data.reduce((acc, client) => {
      const products = Array.isArray(client.products) ? client.products : [];
      return acc + products.reduce((pAcc, p) => pAcc + Number(p.cantidad || 0), 0);
    }, 0);
  }, [data]);

  const resetOrders = async () => {
    if (confirm("¿Limpiar pedidos de hoy?")) {
      await fetch('/api/reset', { method: 'POST' });
    }
  };

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
          <>
            <div className="absolute inset-0 flex overflow-x-auto p-10 gap-10 items-start custom-scroll-horizontal">
              {!Array.isArray(data) || data.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-4xl uppercase tracking-[1em]">
                  Sin Datos
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
            <button 
              onClick={resetOrders}
              className="absolute bottom-10 right-10 p-5 bg-red-600/20 hover:bg-red-600 text-red-600 hover:text-white rounded-full transition-all border border-red-600/20 z-50"
            >
              <Trash2 size={24} />
            </button>
          </>
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
