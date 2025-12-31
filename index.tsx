
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Layout, BarChart, Settings, Sun, Moon, 
  CheckCircle, AlertCircle, TrendingUp, Package, Calendar, 
  X, Upload, Globe, Clipboard, ArrowRight 
} from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- TIPOS ---
const DEFAULT_SETTINGS = {
  displayMode: 'both',
  nameFontSize: 14,
  codeFontSize: 18,
  clientNameFontSize: 28,
};

// --- COMPONENTE: HEADER ---
const Header = ({ darkMode, setDarkMode, view, setView, onSettings, total }) => (
  <header className="flex-none h-20 flex items-center justify-between px-8 border-b bg-black/20 backdrop-blur-xl border-white/10">
    <div className="flex items-center gap-4">
      <div className="bg-red-600 p-2.5 rounded-xl shadow-lg shadow-red-600/30">
        <Factory color="white" size={24} />
      </div>
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter">Factory<span className="text-red-600">Sync</span></h1>
        <p className="text-[8px] font-black opacity-40 tracking-[0.3em]">POSTGRES REAL-TIME V4</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
        <button onClick={() => setView('live')} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${view === 'live' ? 'bg-red-600 text-white' : 'hover:bg-white/10 opacity-50'}`}>EN VIVO</button>
        <button onClick={() => setView('stats')} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${view === 'stats' ? 'bg-red-600 text-white' : 'hover:bg-white/10 opacity-50'}`}>ESTADÍSTICAS</button>
      </div>
      <div className="text-right pr-4 border-r border-white/10">
        <span className="block text-[8px] font-black opacity-30 uppercase">Total Hoy</span>
        <span className="text-3xl font-black text-red-600 leading-none">{total}</span>
      </div>
      <button onClick={onSettings} className="p-2.5 bg-white/5 rounded-lg border border-white/10 hover:bg-red-600 transition-colors"><Settings size={18} /></button>
      <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-white/5 rounded-lg border border-white/10">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
    </div>
  </header>
);

// --- COMPONENTE: COLUMNA CLIENTE ---
const ClientColumn = ({ client, darkMode, settings, highlightedCode }) => {
  const totalQty = client.products.reduce((acc, p) => acc + Number(p.cantidad), 0);
  const totalStock = client.products.reduce((acc, p) => acc + Number(p.stock), 0);
  const progress = totalQty > 0 ? (totalStock / totalQty) * 100 : 0;

  return (
    <div className={`flex-none w-[420px] flex flex-col h-full rounded-[2.5rem] border shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200'}`}>
      <div className="p-8 border-b bg-black/10">
        <h2 className="font-black uppercase tracking-tighter truncate mb-4" style={{ fontSize: `${settings.clientNameFontSize}px` }}>{client.client_name}</h2>
        <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
          <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {client.products.map((p, idx) => {
          const lack = Math.max(0, p.cantidad - p.stock);
          const isDone = lack <= 0;
          return (
            <div key={idx} className={`p-5 rounded-3xl border transition-all duration-500 ${highlightedCode === p.codigo ? 'bg-green-500/20 scale-[1.02] border-green-500' : isDone ? 'opacity-30 grayscale' : darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-lg" style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.codigo}</span>
                {isDone ? <CheckCircle className="text-green-500" size={18} /> : <AlertCircle className="text-orange-500" size={18} />}
              </div>
              <div className="text-[10px] font-bold uppercase opacity-50 mb-4" style={{ fontSize: `${settings.nameFontSize}px` }}>{p.nombre}</div>
              <div className="flex justify-between items-end pt-3 border-t border-black/5">
                <div className="text-center"><p className="text-[7px] font-black opacity-30 uppercase">Falta</p><p className={`text-lg font-black ${isDone ? 'text-green-500' : 'text-red-500'}`}>{isDone ? 'OK' : lack}</p></div>
                <div className="text-right"><p className="text-[7px] font-black opacity-30 uppercase">Pedido</p><p className="text-3xl font-black leading-none">{p.cantidad}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [view, setView] = useState('live');
  const [darkMode, setDarkMode] = useState(true);
  const [data, setData] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
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

  const totalGlobal = useMemo(() => 
    data.reduce((acc, c) => acc + c.products.reduce((pAcc, p) => pAcc + Number(p.cantidad), 0), 0)
  , [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header darkMode={darkMode} setDarkMode={setDarkMode} view={view} setView={setView} onSettings={() => setIsSettingsOpen(true)} total={totalGlobal} />
      
      <main className="flex-1 relative overflow-hidden">
        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto p-8 gap-8 items-start scrollbar-hide">
            {data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-5xl uppercase tracking-[1em]">En Espera</div>
            ) : (
              data.map((client) => (
                <ClientColumn key={client.agent_code} client={client} darkMode={darkMode} settings={settings} highlightedCode={highlightedCode} />
              ))
            )}
          </div>
        ) : (
          <div className="p-10 h-full overflow-y-auto">
             <h2 className="text-3xl font-black uppercase mb-10">Estadísticas de Producción</h2>
             <div className="grid grid-cols-3 gap-8 mb-10">
                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5"><TrendingUp className="text-red-600 mb-4" /><p className="text-4xl font-black">{totalGlobal}</p><p className="text-[10px] font-bold opacity-40 uppercase">Unidades Hoy</p></div>
                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5"><Package className="text-blue-500 mb-4" /><p className="text-4xl font-black">{data.length}</p><p className="text-[10px] font-bold opacity-40 uppercase">Clientes Activos</p></div>
                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5"><Calendar className="text-green-500 mb-4" /><p className="text-4xl font-black">{new Date().toLocaleDateString()}</p><p className="text-[10px] font-bold opacity-40 uppercase">Fecha Turno</p></div>
             </div>
          </div>
        )}
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
