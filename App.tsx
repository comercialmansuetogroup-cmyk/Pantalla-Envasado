
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
      const json = await res.json();
      setData(json);
    } catch (e) { console.error("Error fetching data:", e); }
  }, []);

  const resetOrders = async () => {
    if (confirm("¿Estás seguro de limpiar todos los pedidos de hoy?")) {
      await fetch('/api/reset', { method: 'POST' });
    }
  };

  useEffect(() => {
    fetchData();
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      fetchData();
      if (msg.updatedCode) {
        setHighlightedCode(msg.updatedCode);
        setTimeout(() => setHighlightedCode(null), 3000);
      }
    };
    return () => es.close();
  }, [fetchData]);

  const globalTotal = useMemo(() => 
    data.reduce((acc, client) => 
      acc + client.products.reduce((pAcc, p) => pAcc + Number(p.cantidad), 0), 0
    ), [data]);

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
              {data.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-4xl uppercase tracking-[1em]">
                  Esperando Datos...
                </div>
              ) : (
                data.map((client) => (
                  <ClientColumn 
                    key={client.name} 
                    group={{
                      name: client.name,
                      code: client.code, // Aquí vendrá "0, 10, 14, 5" para Gran Canaria
                      products: client.products
                    }} 
                    darkMode={darkMode} 
                    settings={settings}
                    highlightedCode={highlightedCode}
                  />
                ))
              )}
            </div>
            
            {/* Botón Flotante para Limpiar Jornada */}
            <button 
              onClick={resetOrders}
              className="absolute bottom-10 right-10 p-5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl transition-all active:scale-90 z-50"
              title="Limpiar pedidos de hoy"
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

      <style>{`
        .custom-scroll-horizontal::-webkit-scrollbar { height: 10px; }
        .custom-scroll-horizontal::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scroll-horizontal::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 10px; }
      `}</style>
    </div>
  );
}
