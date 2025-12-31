
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Settings as SettingsIcon, Sun, Moon, CheckCircle, AlertCircle, 
  TrendingUp, Package, Calendar, X, Trash2, Layout, BarChart
} from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DEFAULT_SETTINGS = {
  clientNameFontSize: 32,
  codeFontSize: 20,
  nameFontSize: 14,
  displayMode: 'both'
};

// --- COMPONENTES AUXILIARES ---
const Header = ({ total, view, setView, onSettings, darkMode, setDarkMode }) => (
  <header className="flex-none h-24 flex items-center justify-between px-10 border-b bg-black/20 backdrop-blur-2xl border-white/10">
    <div className="flex items-center gap-6">
      <div className="bg-red-600 p-4 rounded-2xl shadow-xl shadow-red-600/30">
        <Factory color="white" size={28} />
      </div>
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Factory<span className="text-red-600">Sync</span></h1>
        <p className="text-[9px] font-black opacity-30 tracking-[0.5em]">REAL-TIME ENGINE V10</p>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
        <button onClick={() => setView('live')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${view === 'live' ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}>EN VIVO</button>
        <button onClick={() => setView('stats')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${view === 'stats' ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}>ESTADÍSTICAS</button>
      </div>
      <div className="text-right pr-6 border-r border-white/10">
        <span className="text-[10px] font-black opacity-30 uppercase">Total Global</span>
        <p className="text-5xl font-black text-red-600 leading-none tracking-tighter tabular-nums">{total}</p>
      </div>
      <button onClick={onSettings} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-red-600 transition-colors"><SettingsIcon size={24} /></button>
      <button onClick={() => setDarkMode(!darkMode)} className="p-4 bg-white/5 rounded-2xl border border-white/10">{darkMode ? <Sun size={24} /> : <Moon size={24} />}</button>
    </div>
  </header>
);

const ClientColumn = ({ client, settings, darkMode, highlightedCode }) => {
  const products = Array.isArray(client.products) ? client.products : [];
  return (
    <div className={`flex-none w-[450px] flex flex-col h-full rounded-[3.5rem] border shadow-2xl overflow-hidden ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
      <div className="p-10 border-b bg-black/10">
        <h2 className="font-black uppercase tracking-tighter truncate mb-4" style={{ fontSize: `${settings.clientNameFontSize}px` }}>{client.name}</h2>
        <div className="flex justify-between items-center text-[10px] font-black opacity-40 mb-2 uppercase tracking-widest">
          <span>IDs: {client.code}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scroll">
        {products.map((p, idx) => {
          const lack = Math.max(0, p.cantidad - p.stock);
          const isDone = lack <= 0;
          return (
            <div key={idx} className={`p-6 rounded-[2.2rem] border transition-all duration-500 ${highlightedCode === p.codigo ? 'bg-green-500/20 border-green-500 scale-[1.03]' : isDone ? 'opacity-30 grayscale' : darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black tracking-tighter" style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.codigo}</span>
                {isDone ? <CheckCircle className="text-green-500" size={20} /> : <AlertCircle className="text-orange-500" size={20} />}
              </div>
              <div className="font-bold opacity-40 uppercase truncate mb-5" style={{ fontSize: `${settings.nameFontSize}px` }}>{p.nombre}</div>
              <div className="flex justify-between items-end pt-5 border-t border-black/5">
                <div className="text-center"><p className="text-[8px] font-black opacity-30 uppercase">Stock</p><p className="text-xl font-black text-blue-500">{p.stock}</p></div>
                <div className="text-center"><p className="text-[8px] font-black opacity-30 uppercase">Falta</p><p className={`text-xl font-black ${isDone ? 'text-green-500' : 'text-red-500'}`}>{isDone ? 'OK' : lack}</p></div>
                <div className="text-right"><p className="text-[8px] font-black opacity-30 uppercase">Pedido</p><p className="text-4xl font-black leading-none tabular-nums">{p.cantidad}</p></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-10 border-t bg-red-600/5 flex justify-between items-center">
        <div><p className="text-[10px] font-black opacity-30 uppercase">Total Cliente</p><p className="text-6xl font-black text-red-600 tracking-tighter tabular-nums leading-none">{products.reduce((a,b)=>a+Number(b.cantidad),0)}</p></div>
        <div className="text-right"><p className="text-[10px] font-black opacity-30 uppercase">Items</p><p className="text-3xl font-black">{products.length}</p></div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('fs_v10_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error("Server error");
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
      else setData([]);
    } catch (e) { 
      console.error("Fetch error:", e);
      setData([]);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const es = new EventSource('/api/events');
    es.onmessage = () => fetchData();
    return () => es.close();
  }, [fetchData]);

  const totalGlobal = useMemo(() => {
    if (!Array.isArray(data)) return 0;
    return data.reduce((acc, c) => {
      const products = Array.isArray(c.products) ? c.products : [];
      return acc + products.reduce((pAcc, p) => pAcc + Number(p.cantidad || 0), 0);
    }, 0);
  }, [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header 
        total={totalGlobal} 
        view={view} 
        setView={setView} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        onSettings={() => setIsSettingsOpen(true)} 
      />
      <main className="flex-1 relative overflow-hidden">
        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto p-10 gap-10 items-start custom-scroll-horizontal">
            {data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-4xl uppercase tracking-[1em]">Esperando Datos...</div>
            ) : (
              data.map((client) => <ClientColumn key={client.name} client={client} settings={settings} darkMode={darkMode} highlightedCode={highlightedCode} />)
            )}
          </div>
        ) : (
          <div className="p-20 text-center opacity-40 font-black text-2xl uppercase">Estadísticas Próximamente</div>
        )}
      </main>
      
      {/* Botón Reset */}
      <button 
        onClick={() => confirm("¿Limpiar todo?") && fetch('/api/reset', {method:'POST'})}
        className="absolute bottom-10 right-10 p-5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-full transition-all border border-red-500/20"
      >
        <Trash2 size={24} />
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
