
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { ClientColumn } from './components/ClientColumn';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { DEFAULT_SETTINGS, VisualSettings } from './types';
import { CLIENT_MAPPING } from './constants';

export default function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<VisualSettings>(() => {
    const saved = localStorage.getItem('factory_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      setRawData(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchData();
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'update') {
        fetchData();
        if (msg.updatedCode) {
          setHighlightedCode(msg.updatedCode);
          setTimeout(() => setHighlightedCode(null), 3000);
        }
      }
    };
    return () => es.close();
  }, [fetchData]);

  const clientGroups = useMemo(() => {
    const groups: Record<string, any> = {};
    rawData.forEach(row => {
      const agentCode = row.agent_code || '0';
      if (!groups[agentCode]) {
        groups[agentCode] = {
          code: agentCode,
          name: CLIENT_MAPPING[agentCode] || row.client_name || 'CLIENTE',
          products: []
        };
      }
      groups[agentCode].products.push({
        codigo: row.product_code,
        nombre: row.product_name,
        cantidad: Number(row.quantity),
        stock: Number(row.stock_real)
      });
    });
    return Object.values(groups);
  }, [rawData]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        view={view} 
        setView={setView} 
        onSettings={() => setIsSettingsOpen(true)}
        total={rawData.reduce((acc, r) => acc + Number(r.quantity), 0)}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'live' ? (
          <div className="h-full flex overflow-x-auto p-6 gap-6 custom-scroll">
            {clientGroups.map((g: any) => (
              <ClientColumn 
                key={g.code} 
                group={g} 
                darkMode={darkMode} 
                settings={settings}
                highlightedCode={highlightedCode}
              />
            ))}
          </div>
        ) : (
          <StatsDashboard darkMode={darkMode} />
        )}
      </main>

      {/* Fix: Updated props 'settings' to 'visualSettings' and 'onSave' to 'onSaveSettings' */}
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
        .custom-scroll::-webkit-scrollbar { height: 8px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,0,0,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}