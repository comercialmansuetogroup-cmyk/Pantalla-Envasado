import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Factory, Moon, Sun, Clock, Radio, AlertTriangle } from 'lucide-react';

// --- UTILIDADES DE SEGURIDAD ---

const SafeText: React.FC<{ value: any; label?: string }> = ({ value, label }) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    if (React.isValidElement(value)) return <>{value}</>;
    try {
      return <span>{JSON.stringify(value)}</span>;
    } catch (e) {
      return <span>[Error: Object]</span>;
    }
  }
  return <>{value}</>;
};

const roundSafe = (num: any): number => {
  const val = Number(num);
  return isNaN(val) ? 0 : Math.round((val + Number.EPSILON) * 100) / 100;
};

// --- MAPPING ACTUALIZADO SEGÚN REQUERIMIENTOS ---
// Filippo 24 | Pingüino 26 | La palma 23 | Tenerife norte 15 | Gran canaria 10, 14, 5, 0
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
      // Prioridad a Gran Canaria
      if (a.clientName === 'GRAN CANARIA') return -1;
      if (b.clientName === 'GRAN CANARIA') return 1;
      return a.clientName.localeCompare(b.clientName);
    });
};

// --- COMPONENTES UI ---

const ProductItem: React.FC<{ name: string; qty: number; isCompact: boolean }> = ({ name, qty, isCompact }) => (
  <div className={`flex items-center justify-between py-0.5 px-1 border-b border-white/[0.03] group hover:bg-white/[0.03] transition-colors overflow-hidden`}>
    <div className={`font-bold leading-[1.1] text-gray-400 group-hover:text-red-500 transition-colors uppercase truncate pr-1 ${isCompact ? 'text-[9px] xl:text-[10px]' : 'text-xs xl:text-sm'}`}>
      <SafeText value={name} label="productName" />
    </div>
    <div className={`font-black tabular-nums text-white group-hover:text-red-600 transition-all ${isCompact ? 'text-lg xl:text-xl' : 'text-2xl xl:text-3xl'}`}>
      <SafeText value={qty} label="productQty" />
    </div>
  </div>
);

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => {
  const productCount = data.products.length;
  
  // Lógica de columnas ultra-dinámica
  // Si hay más de 20 productos (como suele pasar en GC), usamos 3 columnas si hay espacio, o 2 compactas.
  let gridCols = 'grid-cols-1';
  let isCompact = false;

  if (productCount > 30) {
    gridCols = 'grid-cols-3';
    isCompact = true;
  } else if (productCount > 13) {
    gridCols = 'grid-cols-2';
    isCompact = true;
  }

  // Dividir productos para las columnas
  const renderProducts = () => {
    if (gridCols === 'grid-cols-3') {
      const third = Math.ceil(productCount / 3);
      return (
        <>
          <div className="flex flex-col gap-0.5">{data.products.slice(0, third).map((p, i) => <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={true} />)}</div>
          <div className="flex flex-col gap-0.5 border-l border-white/[0.03] pl-2">{data.products.slice(third, third * 2).map((p, i) => <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={true} />)}</div>
          <div className="flex flex-col gap-0.5 border-l border-white/[0.03] pl-2">{data.products.slice(third * 2).map((p, i) => <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={true} />)}</div>
        </>
      );
    } else if (gridCols === 'grid-cols-2') {
      const half = Math.ceil(productCount / 2);
      return (
        <>
          <div className="flex flex-col gap-0.5">{data.products.slice(0, half).map((p, i) => <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={true} />)}</div>
          <div className="flex flex-col gap-0.5 border-l border-white/[0.03] pl-3">{data.products.slice(half).map((p, i) => <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={true} />)}</div>
        </>
      );
    }
    return (
      <div className="flex flex-col gap-0.5 w-full">
        {data.products.map((p, i) => <ProductItem key={i} name={p.name} qty={p.totalQuantity} isCompact={false} />)}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full border-r last:border-r-0 transition-all ${data.clientName === 'GRAN CANARIA' ? 'flex-[2.5]' : 'flex-1'} min-w-0 ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className={`px-4 py-2 border-b flex justify-between items-center ${darkMode ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`text-xl xl:text-2xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <SafeText value={data.clientName} />
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-black text-gray-500">{productCount} SKU</span>
           <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
        </div>
      </div>
      
      {/* Listado */}
      <div className="flex-1 px-2 py-1 overflow-hidden">
        <div className={`grid h-full gap-x-2 ${gridCols}`}>
          {renderProducts()}
        </div>
      </div>
      
      {/* Footer Ajustado (Más pequeño por petición) */}
      <div className={`px-4 py-2 mt-auto border-t-2 ${darkMode ? 'bg-red-600/5 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest leading-none">TOTAL ACUMULADO</span>
            <span className="text-[9px] font-bold text-red-600/50 uppercase mt-0.5 italic">PLANTA ONLINE</span>
          </div>
          <span className="text-4xl xl:text-5xl font-black text-red-600 leading-none tabular-nums tracking-tighter">
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
      console.error("Fetch Error:", e);
      setError(e.message);
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
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
      <header className={`flex-none w-full px-6 py-3 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2 rounded-lg shadow-lg"><Factory size={20} className="text-white" /></div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.4em] mt-0.5">SISTEMA DE CONTROL • DEBUG ACTIVADO</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {error && (
              <div className="flex items-center gap-2 px-2 py-1 bg-red-600/10 border border-red-600/30 rounded text-red-500 text-[8px] font-bold animate-pulse uppercase">
                <AlertTriangle size={10} /> <SafeText value={error} />
              </div>
            )}
            <div className="flex flex-col items-end px-6 border-r border-white/10">
               <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">PRODUCCIÓN PLANTA</span>
               <span className="text-4xl font-black text-red-600 tabular-nums leading-none tracking-tighter">
                <SafeText value={totalPlanta.toLocaleString('es-ES')} />
               </span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200'}`}>
              {darkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in opacity-30">
            <Radio size={48} className="animate-pulse text-red-600" />
            <h2 className="text-xl font-black uppercase tracking-[1em]">ESPERANDO DATOS...</h2>
          </div>
        ) : (
          <div className="flex w-full h-full animate-fade-in">
            {clientGroups.map((g) => <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      <footer className={`flex-none px-6 py-1.5 border-t flex justify-between items-center text-[8px] font-black uppercase tracking-[0.3em] ${darkMode ? 'bg-slate-900 border-white/5 text-gray-700' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          NÚCLEO ONLINE • {clientGroups.length} NODOS ACTIVOS
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <Clock size={8} />
            SYNC: {lastUpdated.toLocaleTimeString()}
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