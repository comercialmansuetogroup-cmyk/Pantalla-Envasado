
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Layout, BarChart, Settings, Sun, Moon, 
  CheckCircle, AlertCircle, TrendingUp, Package, Calendar, 
  X, Clipboard, ArrowRight, Upload, Globe, Layers
} from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- CONFIGURACIÓN POR DEFECTO ---
const DEFAULT_SETTINGS = {
  nameFontSize: 14,
  codeFontSize: 20,
  clientNameFontSize: 32,
  displayMode: 'both'
};

// --- COMPONENTE: MODAL DE AJUSTES ---
const SettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="bg-[#0f172a] rounded-[3rem] border border-white/10 w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="p-10 bg-red-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <Settings size={32} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Configuración Visual</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-white/20"><X /></button>
        </div>
        
        <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">Tamaños de Fuente (PX)</h3>
            <div className="space-y-4">
              {['clientNameFontSize', 'codeFontSize', 'nameFontSize'].map(key => (
                <div key={key} className="flex items-center gap-4">
                  <span className="flex-1 text-xs font-bold uppercase opacity-60">{key.replace('FontSize', '')}</span>
                  <input 
                    type="range" min="10" max="60" 
                    value={settings[key]} 
                    onChange={e => onSave({...settings, [key]: parseInt(e.target.value)})}
                    className="accent-red-600"
                  />
                  <span className="w-10 text-right font-black text-red-500">{settings[key]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">Conexión</h3>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
              <p className="text-[10px] font-black text-red-500 uppercase">Make Webhook URL</p>
              <code className="block p-3 bg-black rounded-xl text-[10px] truncate opacity-50">{window.location.origin}/api/webhook</code>
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook`)} className="w-full py-3 bg-white/10 rounded-xl text-[10px] font-black hover:bg-white/20 transition-all uppercase">Copiar Enlace</button>
            </div>
          </div>
        </div>
        
        <div className="p-10 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">Cerrar Ajustes</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE: PRODUCTO INDIVIDUAL ---
const ProductRow = ({ p, settings, darkMode, isHigh }) => {
  const lack = Math.max(0, p.cantidad - p.stock);
  const isDone = lack <= 0;
  
  return (
    <div className={`p-6 rounded-[2rem] border transition-all duration-500 ${isHigh ? 'bg-green-500/20 border-green-500 scale-[1.02]' : isDone ? 'opacity-30 grayscale' : darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-black tracking-tighter" style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.codigo}</span>
        {isDone ? <CheckCircle className="text-green-500" size={20} /> : <AlertCircle className="text-orange-500" size={20} />}
      </div>
      <div className="font-bold opacity-40 uppercase truncate mb-4" style={{ fontSize: `${settings.nameFontSize}px` }}>{p.nombre}</div>
      <div className="flex justify-between items-end pt-4 border-t border-black/5">
        <div className="text-center"><p className="text-[8px] font-black opacity-30 uppercase">Falta</p><p className={`text-xl font-black ${isDone ? 'text-green-500' : 'text-red-500'}`}>{isDone ? 'OK' : lack}</p></div>
        <div className="text-right"><p className="text-[8px] font-black opacity-30 uppercase">Pedido</p><p className="text-4xl font-black leading-none">{p.cantidad}</p></div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL: APP ---
function App() {
  const [view, setView] = useState('live');
  const [darkMode, setDarkMode] = useState(true);
  const [data, setData] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState(null);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('fs_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
    } catch (e) { console.error("API Error:", e); }
  }, []);

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
    data.reduce((acc, c) => acc + c.products.reduce((pAcc, p) => pAcc + Number(p.cantidad), 0), 0)
  , [data]);

  const handleSaveSettings = (newS) => {
    setSettings(newS);
    localStorage.setItem('fs_settings', JSON.stringify(newS));
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER DINÁMICO */}
      <header className="flex-none h-24 flex items-center justify-between px-10 border-b bg-black/20 backdrop-blur-2xl border-white/10">
        <div className="flex items-center gap-6">
          <div className="bg-red-600 p-3.5 rounded-2xl shadow-2xl shadow-red-600/40 animate-pulse">
            <Factory color="white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Factory<span className="text-red-600">Sync</span></h1>
            <p className="text-[9px] font-black opacity-30 tracking-[0.5em]">REAL-TIME DATABASE V5</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button onClick={() => setView('live')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${view === 'live' ? 'bg-red-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>EN VIVO</button>
            <button onClick={() => setView('stats')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${view === 'stats' ? 'bg-red-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>ESTADÍSTICAS</button>
          </div>
          <div className="text-right pr-6 border-r border-white/10">
            <span className="text-[10px] font-black opacity-30 uppercase">Unidades Totales</span>
            <p className="text-5xl font-black text-red-600 leading-none tracking-tighter">{globalTotal}</p>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-red-600 transition-colors"><Settings size={24} /></button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-4 bg-white/5 rounded-2xl border border-white/10">{darkMode ? <Sun size={24} /> : <Moon size={24} />}</button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 relative overflow-hidden">
        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto p-10 gap-10 items-start custom-scroll">
            {data.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-10 font-black text-6xl uppercase tracking-[1em]">
                Esperando Datos
              </div>
            ) : (
              data.map((client) => (
                <div key={client.agent_code} className={`flex-none w-[450px] flex flex-col h-full rounded-[3.5rem] border shadow-2xl overflow-hidden ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                  <div className="p-10 border-b bg-black/10">
                    <h2 className="font-black uppercase tracking-tighter truncate mb-4" style={{ fontSize: `${settings.clientNameFontSize}px` }}>{client.client_name}</h2>
                    <div className="flex justify-between items-center text-[10px] font-black opacity-40 mb-2 uppercase">
                      <span>Progreso Cliente</span>
                      <span>ID: {client.agent_code}</span>
                    </div>
                    <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${Math.min(100, (client.products.reduce((a,b)=>a+b.stock,0)/client.products.reduce((a,b)=>a+b.cantidad,0))*100)}%` }} />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scroll">
                    {client.products.map((p, idx) => (
                      <ProductRow key={idx} p={p} settings={settings} darkMode={darkMode} isHigh={highlightedCode === p.codigo} />
                    ))}
                  </div>
                  <div className="p-10 border-t bg-red-600/5 flex justify-between items-center">
                    <div><p className="text-[10px] font-black opacity-30 uppercase">Total Unidades</p><p className="text-6xl font-black text-red-600 tracking-tighter">{client.products.reduce((a,b)=>a+Number(b.cantidad),0)}</p></div>
                    <div className="text-right"><p className="text-[10px] font-black opacity-30 uppercase">Productos</p><p className="text-3xl font-black">{client.products.length}</p></div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-16 h-full overflow-y-auto space-y-12">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Panel de Inteligencia</h2>
            <div className="grid grid-cols-3 gap-10">
              <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10"><TrendingUp className="text-red-600 mb-6" size={40} /><p className="text-6xl font-black tracking-tighter">{globalTotal}</p><p className="text-xs font-bold opacity-40 uppercase tracking-widest">Unidades Producidas Hoy</p></div>
              <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10"><Package className="text-blue-500 mb-6" size={40} /><p className="text-6xl font-black tracking-tighter">{data.length}</p><p className="text-xs font-bold opacity-40 uppercase tracking-widest">Clientes en Ruta</p></div>
              <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10"><Calendar className="text-green-500 mb-6" size={40} /><p className="text-4xl font-black uppercase">{new Date().toLocaleDateString('es-ES', {weekday: 'long'})}</p><p className="text-xs font-bold opacity-40 uppercase tracking-widest">Estado del Turno</p></div>
            </div>
          </div>
        )}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(220, 38, 38, 0.4); border-radius: 20px; border: 3px solid transparent; background-clip: content-box; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #dc2626; }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
