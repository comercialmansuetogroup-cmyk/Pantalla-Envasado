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
  <div className="flex items-center justify-between py-2.5 px-3 border-b border-white/[0.08] group hover:bg-white/[0.03] transition-colors">
    <div className="flex-1 min-w-0 pr-6">
      <div className="text-lg xl:text-xl font-black text-slate-400 group-hover:text-red-500 transition-colors uppercase truncate leading-none tracking-tight">
        <SafeText value={name} />
      </div>
    </div>
    <div className="text-4xl xl:text-6xl font-black tabular-nums text-white group-hover:text-red-600 transition-all leading-none tracking-tighter">
      <SafeText value={qty} />
    </div>
  </div>
);

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => {
  const productCount = data.products.length;
  const MAX_ROWS = 20;
  const numCols = Math.ceil(productCount / MAX_ROWS) || 1;

  // Creamos arrays para cada columna de 20 productos
  const columns = [];
  for (let i = 0; i < numCols; i++) {
    columns.push(data.products.slice(i * MAX_ROWS, (i + 1) * MAX_ROWS));
  }

  return (
    <div 
      style={{ flex: `${numCols} 0 auto` }} 
      className={`flex flex-col h-full border-r last:border-r-0 transition-all min-w-[400px] ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}
    >
      {/* Header */}
      <div className={`px-6 py-5 border-b-2 flex justify-between items-center ${darkMode ? 'bg-white/[0.02] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`text-3xl xl:text-5xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <SafeText value={data.clientName} />
        </h3>
        <div className="flex items-center gap-4">
           <span className="text-xs font-black text-slate-500 bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">{productCount} SKU</span>
           <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
        </div>
      </div>
      
      {/* Listado de Productos en Grid de Columnas de 20 filas */}
      <div className="flex-1 flex overflow-hidden">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className={`flex-1 flex flex-col p-2 ${colIdx > 0 ? 'border-l border-white/[0.05]' : ''}`}>
            {colProducts.map((p: any, i: number) => (
              <ProductItem key={i} name={p.name} qty={p.totalQuantity} />
            ))}
          </div>
        ))}
      </div>
      
      {/* Footer (Gran Total) */}
      <div className={`px-8 py-5 mt-auto border-t-4 ${darkMode ? 'bg-red-600/10 border-red-600/30' : 'bg-red-50 border-red-200'}`}>
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-slate-500 tracking-[0.3em] leading-none mb-2">TOTAL ACUMULADO</span>
            <span className="text-sm font-bold text-red-600/60 uppercase italic">OPERACIÓN EN VIVO</span>
          </div>
          <span className="text-6xl xl:text-8xl font-black text-red-600 leading-none tabular-nums tracking-tighter">
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      if (json && json.zonas) {
        setClientGroups(processIncomingData(json));
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (e: any) {
      console.error("Fetch Error:", e);
      setError("Error de conexión con el servidor");
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
      <header className={`flex-none w-full px-10 py-5 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-3 rounded-2xl shadow-2xl"><Factory size={32} className="text-white" /></div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-xs font-black text-slate-500 uppercase tracking-[0.6em] mt-1.5">SISTEMA DE CONTROL DE ENVASADO</p>
            </div>
          </div>
          
          <div className="flex items-center gap-12">
            {error && (
              <div className="flex items-center gap-3 px-4 py-2 bg-red-600/20 border border-red-600/40 rounded-xl text-red-500 text-xs font-black animate-pulse uppercase">
                <AlertTriangle size={16} /> <SafeText value={error} />
              </div>
            )}
            <div className="flex flex-col items-end pr-12 border-r border-white/10">
               <span className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-2">PRODUCCIÓN GLOBAL PLANTA</span>
               <span className="text-6xl font-black text-red-600 tabular-nums leading-none tracking-tighter">
                <SafeText value={totalPlanta.toLocaleString('es-ES')} />
               </span>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center p-3">
                 {loading && <Loader2 size={24} className="animate-spin text-red-600" />}
              </div>
              <button onClick={() => setDarkMode(!darkMode)} className={`p-4 rounded-2xl border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200'}`}>
                {darkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-x-auto overflow-y-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 animate-fade-in opacity-40">
            <Radio size={96} className="animate-pulse text-red-600" />
            <h2 className="text-4xl font-black uppercase tracking-[1.5em] text-slate-500">CONECTANDO...</h2>
          </div>
        ) : (
          <div className="flex h-full animate-fade-in">
            {clientGroups.map((g) => <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      <footer className={`flex-none px-10 py-3.5 border-t flex justify-between items-center text-xs font-black uppercase tracking-[0.5em] ${darkMode ? 'bg-slate-900 border-white/5 text-slate-600' : 'bg-slate-200 border-gray-300 text-slate-500'}`}>
        <div className="flex items-center gap-5">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
          ESTADO: NÚCLEO ONLINE • {clientGroups.length} NODOS
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 opacity-40">
            <Database size={14} />
            SYNC_V4_PROD
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-3 text-slate-400">
              <Clock size={16} />
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