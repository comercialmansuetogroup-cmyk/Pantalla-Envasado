import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Factory, Moon, Sun, Clock, Radio, AlertTriangle } from 'lucide-react';

// --- UTILIDADES DE SEGURIDAD ---

const SafeValue: React.FC<{ value: any; label: string }> = ({ value, label }) => {
  if (value === null || value === undefined) return null;
  const type = typeof value;
  if (type === 'object' && !React.isValidElement(value)) {
    console.error(`🚨 ERROR #31: Objeto ilegal en "${label}":`, value);
    return <span className="text-red-500 text-[10px]">[Error Datos]</span>;
  }
  return <>{value}</>;
};

const roundSafe = (num: any): number => {
  const val = Number(num);
  if (isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

// --- MAPPING ---
const CLIENT_MAPPING: Record<string, string> = {
  '0': 'GRAN CANARIA',
  '10': 'GRAN CANARIA',
  '14': 'GRAN CANARIA',
  '5': 'GRAN CANARIA',
  '24': 'FILIPPO',
  '26': 'PINGÜINO',
  '23': 'INSÓLITO',
  '15': 'TENERIFE NORTE',
};

// --- PROCESADOR DE DATOS ---
const processIncomingData = (data: any) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) return [];
  
  const clientMap = new Map<string, any>();

  data.zonas.forEach((zona: any) => {
    let agentCodeRaw = "0";
    if (zona.codigo_agente !== undefined && zona.codigo_agente !== null) {
      agentCodeRaw = String(zona.codigo_agente).trim();
    }
    
    if (agentCodeRaw === '' || agentCodeRaw === 'null' || agentCodeRaw === '0') agentCodeRaw = '0';
    
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

const ProductItem: React.FC<{ name: string; qty: number; isCompact: boolean }> = ({ name, qty, isCompact }) => (
  <div className={`flex items-center justify-between py-1 px-1 border-b border-white/[0.03] group hover:bg-white/[0.02] transition-colors`}>
    <span className={`font-bold leading-tight text-gray-400 group-hover:text-red-500 transition-colors uppercase truncate pr-2 ${isCompact ? 'text-[10px] xl:text-xs' : 'text-sm xl:text-base'}`}>
      <SafeValue value={name} label="prodName" />
    </span>
    <span className={`font-black tabular-nums text-white group-hover:text-red-600 transition-all ${isCompact ? 'text-xl xl:text-2xl' : 'text-3xl xl:text-4xl'}`}>
      {qty}
    </span>
  </div>
);

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => {
  const isLarge = data.products.length > 12;

  return (
    <div className={`flex flex-col flex-1 min-w-0 h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
      {/* Header Compacto */}
      <div className={`px-4 py-3 border-b flex justify-between items-center ${darkMode ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`text-xl xl:text-2xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-950'}`}>
          <SafeValue value={data.clientName} label="clientName" />
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-black text-gray-500">{data.products.length} SKU</span>
           <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
        </div>
      </div>
      
      {/* Listado con Lógica de Columnas */}
      <div className="flex-1 px-3 py-2 overflow-hidden">
        <div className={`grid h-full gap-x-6 ${isLarge ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Si es largo, dividimos el array en dos para que el flujo sea de arriba abajo por columnas */}
          {isLarge ? (
            <>
              <div className="flex flex-col">
                {data.products.slice(0, Math.ceil(data.products.length / 2)).map((p: any, i: number) => (
                  <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={true} />
                ))}
              </div>
              <div className="flex flex-col">
                {data.products.slice(Math.ceil(data.products.length / 2)).map((p: any, i: number) => (
                  <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={true} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col">
              {data.products.map((p: any, i: number) => (
                <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={false} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Optimizador de Espacio */}
      <div className={`px-6 py-4 mt-auto border-t-2 ${darkMode ? 'bg-red-600/5 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">PRODUCCIÓN TOTAL</span>
            <span className="text-[10px] font-bold text-red-600/50 uppercase">CLIENTE ACTIVO</span>
          </div>
          <span className="text-5xl xl:text-7xl font-black text-red-600 leading-none tabular-nums tracking-tighter">
            {roundSafe(data.grandTotal).toLocaleString('es-ES')}
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

  const fetchData = useCallback(async () => {
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
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalPlanta = useMemo(() => {
    return roundSafe(clientGroups.reduce((acc, c) => acc + c.grandTotal, 0));
  }, [clientGroups]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
      <header className={`flex-none w-full px-8 py-4 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-lg shadow-lg"><Factory size={24} className="text-white" /></div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.5em] mt-1">PANEL CENTRAL DE ENVASADO</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {error && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-600/10 border border-red-600/30 rounded text-red-500 text-[10px] font-bold animate-pulse">
                <AlertTriangle size={12} /> {error.toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-end px-8 border-r border-white/10">
               <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">GLOBAL PLANTA</span>
               <span className="text-6xl font-black text-red-600 tabular-nums leading-none tracking-tighter">
                {totalPlanta.toLocaleString('es-ES')}
               </span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-lg border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200'}`}>
              {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in opacity-30">
            <Radio size={64} className="animate-pulse text-red-600" />
            <h2 className="text-3xl font-black uppercase tracking-[1em]">ESPERANDO DATOS...</h2>
          </div>
        ) : (
          <div className="flex w-full h-full animate-fade-in divide-x divide-white/5">
            {clientGroups.map((g) => <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      <footer className={`flex-none px-8 py-2 border-t flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] ${darkMode ? 'bg-slate-900 border-white/5 text-gray-700' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          SISTEMA SINCRONIZADO • {clientGroups.length} NODOS DE PLANTA
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <Clock size={10} />
            ACTUALIZADO: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}