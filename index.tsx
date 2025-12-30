import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Factory, Moon, Sun, Clock, Radio, AlertTriangle, Server, Database, Loader2 } from 'lucide-react';

// --- UTILIDADES DE SEGURIDAD ---

const SafeText: React.FC<{ value: any; label?: string }> = ({ value, label }) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    if (React.isValidElement(value)) return <>{value}</>;
    try {
      return <span>{JSON.stringify(value)}</span>;
    } catch (e) {
      return <span>[Err: Object]</span>;
    }
  }
  return <>{value}</>;
};

const roundSafe = (num: any): number => {
  const val = Number(num);
  return isNaN(val) ? 0 : Math.round((val + Number.EPSILON) * 100) / 100;
};

// --- MAPPING ---
const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO',
  '26': 'PINGÜINO',
  '23': 'LA PALMA',
  '15': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA',
  '14': 'GRAN CANARIA',
  '5': 'GRAN CANARIA',
  '0': 'GRAN CANARIA'
};

const processIncomingData = (data: any) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) return [];
  
  const clientMap = new Map<string, any>();

  data.zonas.forEach((zona: any) => {
    let agentCodeRaw = String(zona.codigo_agente !== undefined ? zona.codigo_agente : '').trim();
    if (agentCodeRaw === '' || agentCodeRaw === 'null') agentCodeRaw = '0';
    
    const clientName = CLIENT_MAPPING[agentCodeRaw] || `ZONA ${agentCodeRaw}`;
    
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        clientName: clientName,
        productTotals: new Map<string, number>(),
        grandTotal: 0
      });
    }

    const clientGroup = clientMap.get(clientName);
    let lineQty = 0;
    
    if (Array.isArray(zona.productos)) {
      lineQty = zona.productos.reduce((acc: number, p: any) => acc + (Number(p.cantidad) || 0), 0);
    } else if (zona.cantidad !== undefined) {
      lineQty = Number(zona.cantidad) || 0;
    }

    const productName = String(zona.nombre || 'PRODUCTO').trim().toUpperCase();
    const currentProductQty = clientGroup.productTotals.get(productName) || 0;
    
    clientGroup.productTotals.set(productName, roundSafe(currentProductQty + lineQty));
    clientGroup.grandTotal = roundSafe(clientGroup.grandTotal + lineQty);
  });

  return Array.from(clientMap.values())
    .map(client => ({
      ...client,
      products: Array.from(client.productTotals.entries())
        .map(([name, totalQuantity]) => ({ name, totalQuantity }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
    }))
    .sort((a: any, b: any) => {
      if (a.clientName === 'GRAN CANARIA') return -1;
      if (b.clientName === 'GRAN CANARIA') return 1;
      return a.clientName.localeCompare(b.clientName);
    });
};

// --- COMPONENTES UI ---

const ProductItem: React.FC<{ name: string; qty: number }> = ({ name, qty }) => (
  <div className="flex items-center justify-between py-1.5 px-3 border-b border-white/[0.06] group hover:bg-white/[0.02] transition-colors">
    <div className="flex-1 min-w-0 pr-4">
      <div className="text-base xl:text-lg font-black text-slate-400 group-hover:text-red-500 transition-colors uppercase truncate leading-none tracking-tight">
        <SafeText value={name} />
      </div>
    </div>
    <div className="text-3xl xl:text-5xl font-black tabular-nums text-white group-hover:text-red-600 transition-all leading-none tracking-tighter">
      <SafeText value={qty} />
    </div>
  </div>
);

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => {
  const productCount = data.products.length;
  const MAX_ROWS = 20;
  const numCols = Math.ceil(productCount / MAX_ROWS) || 1;

  const columns = [];
  for (let i = 0; i < numCols; i++) {
    columns.push(data.products.slice(i * MAX_ROWS, (i + 1) * MAX_ROWS));
  }

  return (
    <div 
      style={{ flex: `${numCols} 0 auto` }} 
      className={`flex flex-col h-full border-r last:border-r-0 transition-all min-w-[350px] ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}
    >
      {/* Header (Textos más equilibrados) */}
      <div className={`px-5 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-white/[0.01] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`text-2xl xl:text-4xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <SafeText value={data.clientName} />
        </h3>
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-black text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-full uppercase">{productCount} SKU</span>
           <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
        </div>
      </div>
      
      {/* Listado de Productos */}
      <div className="flex-1 flex overflow-hidden">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className={`flex-1 flex flex-col p-1.5 ${colIdx > 0 ? 'border-l border-white/[0.05]' : ''}`}>
            {colProducts.map((p: any, i: number) => (
              <ProductItem key={i} name={p.name} qty={p.totalQuantity} />
            ))}
          </div>
        ))}
      </div>
      
      {/* Footer (Gran Total más equilibrado) */}
      <div className={`px-6 py-4 mt-auto border-t-2 ${darkMode ? 'bg-red-600/5 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">TOTAL ACUMULADO</span>
            <span className="text-[10px] font-bold text-red-600/40 uppercase italic">NÚCLEO ACTIVO</span>
          </div>
          <span className="text-5xl xl:text-7xl font-black text-red-600 leading-none tabular-nums tracking-tighter">
            <SafeText value={roundSafe(data.grandTotal).toLocaleString('es-ES')} />
          </span>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [clientGroups, setClientGroups] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`Servidor: ${res.status}`);
      const json = await res.json();
      
      if (json && json.zonas) {
        setClientGroups(processIncomingData(json));
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (e: any) {
      console.error("Fetch Error:", e);
      // PERSISTENCIA: No borramos los datos actuales si el fetch falla
      setError("Error de sincronización (Datos offline)");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalPlanta = useMemo(() => {
    return roundSafe(clientGroups.reduce((acc, c) => acc + (c.grandTotal || 0), 0));
  }, [clientGroups]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex-none w-full px-8 py-3 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-5">
            <div className="bg-red-600 p-2.5 rounded-xl shadow-lg"><Factory size={28} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-1">SISTEMA DE CONTROL PERSISTENTE</p>
            </div>
          </div>
          
          <div className="flex items-center gap-10">
            {error && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-600/10 border border-amber-600/30 rounded text-amber-500 text-[10px] font-black animate-pulse uppercase">
                <AlertTriangle size={14} /> <SafeText value={error} />
              </div>
            )}
            <div className="flex flex-col items-end pr-10 border-r border-white/10">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">GLOBAL PLANTA</span>
               <span className="text-5xl font-black text-red-600 tabular-nums leading-none tracking-tighter">
                <SafeText value={totalPlanta.toLocaleString('es-ES')} />
               </span>
            </div>
            <div className="flex items-center gap-4">
               {loading && <Loader2 size={18} className="animate-spin text-red-600 opacity-50" />}
               <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200'}`}>
                 {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-x-auto overflow-y-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-in opacity-40">
            <Radio size={80} className="animate-pulse text-red-600" />
            <h2 className="text-3xl font-black uppercase tracking-[1em] text-slate-500">BUSCANDO SEÑAL...</h2>
          </div>
        ) : (
          <div className="flex h-full animate-fade-in">
            {clientGroups.map((g) => <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      <footer className={`flex-none px-8 py-2.5 border-t flex justify-between items-center text-[9px] font-black uppercase tracking-[0.5em] ${darkMode ? 'bg-slate-900 border-white/5 text-slate-600' : 'bg-slate-200 border-gray-300 text-slate-500'}`}>
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]" />
          NÚCLEO OPERATIVO • {clientGroups.length} NODOS ACTIVOS
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Database size={12} />
            PERSIST_MODE_ACTIVE
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-3 text-slate-400">
              <Clock size={14} />
              ÚLTIMA SYNC: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}