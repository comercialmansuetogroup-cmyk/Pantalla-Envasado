
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Factory, Moon, Sun, Radio, Package, Database, CheckCircle2 } from 'lucide-react';

// --- CONFIGURACIÓN VISUAL ---
const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO', '26': 'PINGÜINO', '23': 'LA PALMA', '15': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA', '14': 'GRAN CANARIA', '5': 'GRAN CANARIA', '0': 'GRAN CANARIA'
};

// --- COMPONENTES ---

const ProductRow = ({ p, darkMode, highlighted }) => {
  const toProduce = Math.max(0, p.cantidad - p.stock_fisico);
  const isDone = toProduce <= 0;

  return (
    <div className={`flex items-center justify-between py-3 px-5 border-b transition-all duration-500 ${highlighted ? 'bg-green-500/20 scale-[1.02]' : (darkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50')} ${isDone ? 'opacity-40 grayscale-[0.5]' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={`font-black text-xl leading-none ${isDone ? 'text-green-500' : (darkMode ? 'text-white' : 'text-slate-900')}`}>
            #{p.codigo}
          </div>
          {isDone && <CheckCircle2 size={16} className="text-green-500" />}
        </div>
        <div className="text-[11px] font-bold uppercase opacity-60 truncate tracking-tight">{p.nombre}</div>
      </div>
      
      <div className="flex gap-6 items-center text-right ml-4">
        <div className="flex flex-col">
          <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">Stock</span>
          <span className={`font-bold tabular-nums text-sm ${p.stock_fisico > 0 ? 'text-blue-500' : 'text-slate-500'}`}>
            {p.stock_fisico.toLocaleString('es-ES')}
          </span>
        </div>
        <div className="flex flex-col w-20">
          <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">Falta</span>
          <span className={`font-black tabular-nums text-base ${isDone ? 'text-green-500' : 'text-orange-500'}`}>
            {isDone ? 'LISTO' : toProduce.toLocaleString('es-ES')}
          </span>
        </div>
        <div className="flex flex-col w-20">
          <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">Pedido</span>
          <span className="font-black text-2xl tabular-nums leading-none">{p.cantidad.toLocaleString('es-ES')}</span>
        </div>
      </div>
    </div>
  );
};

const ClientColumn = ({ zona, darkMode, highlightedCode }) => {
  const clientName = CLIENT_MAPPING[zona.codigo_agente] || zona.nombre_agente;
  const totalItems = zona.productos.reduce((acc, p) => acc + p.cantidad, 0);
  const productsDone = zona.productos.filter(p => p.cantidad <= p.stock_fisico).length;

  return (
    <div className={`flex-none w-[480px] flex flex-col h-full border-r ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
      <div className="p-8 border-b-2 bg-black/[0.02]">
        <div className="flex justify-between items-start mb-2">
           <h3 className="text-4xl font-black uppercase tracking-tighter truncate leading-none">{clientName}</h3>
           <div className={`px-3 py-1 rounded-full text-[10px] font-black ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}>
              {productsDone}/{zona.productos.length}
           </div>
        </div>
        <p className="text-[10px] font-black opacity-30 tracking-[0.4em]">NÚCLEO AGENTE: {zona.codigo_agente}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scroll">
        {zona.productos.map(p => (
          <ProductRow key={p.codigo} p={p} darkMode={darkMode} highlighted={highlightedCode === p.codigo} />
        ))}
      </div>
      
      <div className={`p-8 border-t-2 mt-auto transition-colors ${productsDone === zona.productos.length ? 'bg-green-500/10' : 'bg-red-600/[0.03]'}`}>
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[11px] font-black opacity-40 uppercase tracking-widest mb-1">CARGA TOTAL</span>
            <span className="text-8xl font-black text-red-600 tracking-tighter tabular-nums leading-none">
              {totalItems.toLocaleString('es-ES')}
            </span>
          </div>
          {productsDone === zona.productos.length && (
             <div className="flex flex-col items-center gap-1 text-green-500 font-black text-[10px] animate-bounce">
                <Package size={32} />
                COMPLETO
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [data, setData] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [highlightedCode, setHighlightedCode] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const fetchUpdate = useCallback(async () => {
    try {
      const res = await fetch(`/api/data?t=${Date.now()}`);
      const json = await res.json();
      if (json.zonas) {
        setData(json.zonas);
        setLastSync(new Date());
      }
    } catch (e) { console.error("Sync error:", e); }
  }, []);

  useEffect(() => {
    fetchUpdate();
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'update') {
        fetchUpdate();
        if (msg.updatedCode) {
          setHighlightedCode(msg.updatedCode);
          setTimeout(() => setHighlightedCode(null), 3000);
        }
      }
    };
    return () => es.close();
  }, [fetchUpdate]);

  const totalGlobal = useMemo(() => data.reduce((acc, z) => acc + z.productos.reduce((pAcc, p) => pAcc + p.cantidad, 0), 0), [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="flex-none h-24 flex items-center justify-between px-10 border-b-2 border-white/10 bg-black/20 backdrop-blur-2xl">
        <div className="flex items-center gap-6">
          <div className="bg-red-600 p-3 rounded-2xl shadow-2xl shadow-red-600/40 animate-pulse">
            <Factory size={32} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Factory<span className="text-red-600">Flow</span> <span className="text-sm opacity-30 font-normal">v4.0</span></h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></div>
                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">PostgreSQL Live Sync</span>
              </div>
              {lastSync && <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Último Refresco: {lastSync.toLocaleTimeString()}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex flex-col items-end border-r border-white/10 pr-10">
             <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">PRODUCCIÓN GLOBAL</span>
             <span className="text-5xl font-black text-red-600 tracking-tighter tabular-nums leading-none">{totalGlobal.toLocaleString('es-ES')}</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all shadow-xl">
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-x-auto divide-x divide-white/5 custom-scroll">
        {data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
            <Radio size={100} className="animate-bounce mb-6 text-red-600" />
            <h2 className="text-4xl font-black uppercase tracking-[0.8em] ml-[0.8em]">Sincronizando Base de Datos...</h2>
          </div>
        ) : (
          data.map(z => <ClientColumn key={z.codigo_agente} zona={z} darkMode={darkMode} highlightedCode={highlightedCode} />)
        )}
      </main>

      <footer className="h-12 flex-none px-10 flex items-center justify-between bg-black/40 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.6em] opacity-40">
        <div className="flex items-center gap-4">
          <Database size={14} /> PERSISTENCIA EN NUBE RAILWAY • SQL ENGINE
        </div>
        <div className="flex items-center gap-8">
           <span>{data.length} CLIENTES ACTIVOS</span>
           <span>ESTADO: SEGURO</span>
        </div>
      </footer>

      <style>{`
        .custom-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
